// Edge Function parse-receipt (Supabase, Deno).
// Recibe la foto de una boleta, controla sesión, cuota y abuso, llama a la IA y registra el costo.
// La clave de Anthropic vive solo aquí, en los secretos de Supabase. Nunca se guarda la foto ni
// el contenido de la boleta: solo métricas de uso.

import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

import { dailyLimitUsd, overDailyLimit } from '../_shared/spend.ts';
import {
  RECEIPT_JSON_SCHEMA,
  SYSTEM_PROMPT,
  USER_INSTRUCTION,
  estimateUsd,
  monthKey,
  parseAiReceipt,
  validateRequest,
  type ParseReceiptResponse,
  type ParsedReceipt,
} from './logic.ts';

const MODEL = Deno.env.get('AI_MODEL') ?? 'claude-haiku-5-5';
const SCAN_LIMIT = Number(Deno.env.get('SCAN_MONTHLY_LIMIT') ?? '30');
const MAX_PER_MINUTE = 3;
const DAILY_LIMIT_USD = dailyLimitUsd(Deno.env.get('DAILY_LIMIT_USD'));
const MAX_OUTPUT_TOKENS = 4000;

function secretKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    const parsed = JSON.parse(keys) as Record<string, string>;
    const key = parsed.default ?? Object.values(parsed)[0];
    if (key) {
      return key;
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', secretKey(), {
  auth: { persistSession: false },
});
const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
  maxRetries: 1,
  timeout: 45_000,
});

function reply(status: number, body: ParseReceiptResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type AiResult = { receipt: ParsedReceipt | null; usage: Anthropic.Usage };

async function callAi(image: string, mediaType: 'image/jpeg' | 'image/png'): Promise<AiResult> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    // El razonamiento se cobra como salida: se apaga (permitido con esfuerzo bajo).
    thinking: { type: 'disabled' },
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: RECEIPT_JSON_SCHEMA },
    },
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: USER_INSTRUCTION },
        ],
      },
    ],
  });
  if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') {
    return { receipt: null, usage: message.usage };
  }
  const text = message.content.find((block) => block.type === 'text');
  let receipt: ParsedReceipt | null = null;
  if (text && text.type === 'text') {
    try {
      receipt = parseAiReceipt(JSON.parse(text.text));
    } catch {
      receipt = null;
    }
  }
  return { receipt, usage: message.usage };
}

async function logUsage(userId: string, usage: Anthropic.Usage): Promise<void> {
  await admin.from('ai_usage').insert({
    user_id: userId,
    function: 'parse-receipt',
    model: MODEL,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_read_tokens: usage.cache_read_input_tokens ?? 0,
    cache_write_tokens: usage.cache_creation_input_tokens ?? 0,
    usd_estimated: estimateUsd(MODEL, usage),
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return reply(405, { ok: false, error: 'invalid' });
  }

  // 1. Sesión (anónima) válida.
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data: auth } = await admin.auth.getUser(token);
  const userId = auth.user?.id;
  if (!userId) {
    return reply(401, { ok: false, error: 'unauthorized' });
  }

  // 2. Entrada con forma y tamaño válidos.
  const request = validateRequest(await req.json().catch(() => null));
  if ('error' in request) {
    return reply(400, { ok: false, error: 'invalid' });
  }

  // 3. Límite por minuto, para que nadie use el servicio como IA gratis.
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if ((count ?? 0) >= MAX_PER_MINUTE) {
    return reply(429, { ok: false, error: 'rate_limited' });
  }

  // Freno de gasto diario de todo el proyecto (antes de descontar cuota).
  if (await overDailyLimit(admin, DAILY_LIMIT_USD)) {
    return reply(503, { ok: false, error: 'busy' });
  }

  // 4. Cuota mensual (se descuenta antes y se devuelve si la IA falla).
  const month = monthKey(new Date());
  const { data: used } = await admin.rpc('try_consume_quota', {
    p_user: userId,
    p_month: month,
    p_kind: 'scan',
    p_limit: SCAN_LIMIT,
  });
  if (typeof used !== 'number' || used < 0) {
    return reply(429, { ok: false, error: 'quota' });
  }

  // 5. IA, con un reintento si la respuesta no se pudo validar.
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { receipt, usage } = await callAi(request.image, request.mediaType);
      await logUsage(userId, usage);
      if (receipt) {
        return reply(200, { ok: true, receipt, scansLeft: Math.max(0, SCAN_LIMIT - used) });
      }
    }
  } catch (error) {
    console.error(
      'parse-receipt: falla de IA',
      error instanceof Error ? error.name : 'desconocido',
    );
  }
  await admin.rpc('release_quota', { p_user: userId, p_month: month, p_kind: 'scan' });
  return reply(502, { ok: false, error: 'ai_failed' });
});
