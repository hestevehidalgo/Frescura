// Edge Function estimate-ripeness (Supabase, Deno).
// Recibe la foto chica de una fruta o verdura y devuelve su etapa de madurez. La foto no se guarda.
// Controla sesión, límite por minuto, freno de gasto diario y cuota mensual, y registra el costo.

import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

import { estimateUsd, monthKey } from '../parse-receipt/logic.ts';
import { dailyLimitUsd, overDailyLimit } from '../_shared/spend.ts';
import {
  RIPENESS_JSON_SCHEMA,
  SYSTEM_PROMPT,
  parseRipeness,
  userMessage,
  validateRipenessRequest,
  type EstimateRipenessResponse,
  type RipenessProductId,
  type RipenessResult,
} from './logic.ts';

const MODEL = Deno.env.get('AI_MODEL') ?? 'claude-haiku-5-5';
const PHOTO_LIMIT = Number(Deno.env.get('PHOTO_MONTHLY_LIMIT') ?? '10');
const MAX_PER_MINUTE = 3;
const DAILY_LIMIT_USD = dailyLimitUsd(Deno.env.get('DAILY_LIMIT_USD'));
const MAX_OUTPUT_TOKENS = 60;

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
  timeout: 30_000,
});

function reply(status: number, body: EstimateRipenessResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type AiResult = { result: RipenessResult | null; usage: Anthropic.Usage };

async function callAi(image: string, product: RipenessProductId): Promise<AiResult> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    // El razonamiento se cobra como salida: se apaga (permitido con esfuerzo bajo).
    thinking: { type: 'disabled' },
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: RIPENESS_JSON_SCHEMA },
    },
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          { type: 'text', text: userMessage(product) },
        ],
      },
    ],
  });
  if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') {
    return { result: null, usage: message.usage };
  }
  const text = message.content.find((block) => block.type === 'text');
  let result: RipenessResult | null = null;
  if (text && text.type === 'text') {
    try {
      result = parseRipeness(JSON.parse(text.text));
    } catch {
      result = null;
    }
  }
  return { result, usage: message.usage };
}

async function logUsage(userId: string, usage: Anthropic.Usage): Promise<void> {
  await admin.from('ai_usage').insert({
    user_id: userId,
    function: 'estimate-ripeness',
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

  // 2. Entrada válida.
  const request = validateRipenessRequest(await req.json().catch(() => null));
  if ('error' in request) {
    return reply(400, { ok: false, error: 'invalid' });
  }

  // 3. Límite por minuto.
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if ((count ?? 0) >= MAX_PER_MINUTE) {
    return reply(429, { ok: false, error: 'rate_limited' });
  }

  // 4. Freno de gasto diario de todo el proyecto.
  if (await overDailyLimit(admin, DAILY_LIMIT_USD)) {
    return reply(503, { ok: false, error: 'busy' });
  }

  // 5. Cuota mensual de fotos (se devuelve si la IA falla).
  const month = monthKey(new Date());
  const { data: used } = await admin.rpc('try_consume_quota', {
    p_user: userId,
    p_month: month,
    p_kind: 'photo',
    p_limit: PHOTO_LIMIT,
  });
  if (typeof used !== 'number' || used < 0) {
    return reply(429, { ok: false, error: 'quota' });
  }

  // 6. IA (una sola vez: es barata, pero un reintento no suele cambiar el resultado de una foto).
  try {
    const { result, usage } = await callAi(request.image, request.product);
    await logUsage(userId, usage);
    if (result) {
      return reply(200, { ok: true, result, photosLeft: Math.max(0, PHOTO_LIMIT - used) });
    }
  } catch (error) {
    console.error(
      'estimate-ripeness: falla de IA',
      error instanceof Error ? error.name : 'desconocido',
    );
  }
  await admin.rpc('release_quota', { p_user: userId, p_month: month, p_kind: 'photo' });
  return reply(502, { ok: false, error: 'ai_failed' });
});
