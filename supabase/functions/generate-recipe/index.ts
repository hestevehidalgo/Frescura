// Edge Function generate-recipe (Supabase, Deno).
// Inventa una receta con los ingredientes que vencen pronto. Antes de pagar revisa el caché
// compartido: el mismo conjunto de ingredientes y filtros nunca se paga dos veces.
// Solo recibe nombres genéricos de ingredientes; nunca datos de la persona.

import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

import { estimateUsd, monthKey } from '../parse-receipt/logic.ts';
import {
  RECIPE_JSON_SCHEMA,
  SYSTEM_PROMPT,
  cacheKey,
  parseAiRecipe,
  userMessage,
  validateRecipeRequest,
  type AiRecipe,
  type GenerateRecipeResponse,
  type RecipeRequest,
} from './logic.ts';

const MODEL = Deno.env.get('AI_MODEL') ?? 'claude-haiku-5-5';
const RECIPE_LIMIT = Number(Deno.env.get('RECIPE_MONTHLY_LIMIT') ?? '5');
const MAX_PER_MINUTE = 3;
const MAX_OUTPUT_TOKENS = 1200;

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

function reply(status: number, body: GenerateRecipeResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

type AiResult = { recipe: AiRecipe | null; usage: Anthropic.Usage };

async function callAi(request: RecipeRequest): Promise<AiResult> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    // El razonamiento se cobra como salida: se apaga (permitido con esfuerzo bajo).
    thinking: { type: 'disabled' },
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: RECIPE_JSON_SCHEMA },
    },
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage(request) }],
  });
  if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') {
    return { recipe: null, usage: message.usage };
  }
  const text = message.content.find((block) => block.type === 'text');
  let recipe: AiRecipe | null = null;
  if (text && text.type === 'text') {
    try {
      recipe = parseAiRecipe(JSON.parse(text.text), request);
    } catch {
      recipe = null;
    }
  }
  return { recipe, usage: message.usage };
}

async function logUsage(userId: string, usage: Anthropic.Usage): Promise<void> {
  await admin.from('ai_usage').insert({
    user_id: userId,
    function: 'generate-recipe',
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
  const request = validateRecipeRequest(await req.json().catch(() => null));
  if ('error' in request) {
    return reply(400, { ok: false, error: 'invalid' });
  }

  // 3. Caché compartido: si alguien ya pidió lo mismo, se entrega gratis y sin gastar cuota.
  const key = await sha256(cacheKey(request));
  const { data: cached } = await admin
    .from('generated_recipes')
    .select('recipe, uses')
    .eq('cache_key', key)
    .maybeSingle();
  if (cached) {
    const recipe = parseAiRecipe(cached.recipe, request);
    if (recipe) {
      await admin
        .from('generated_recipes')
        .update({ uses: (cached.uses as number) + 1 })
        .eq('cache_key', key);
      return reply(200, { ok: true, recipe, recipesLeft: null, cached: true });
    }
  }

  // 4. Límite por minuto.
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if ((count ?? 0) >= MAX_PER_MINUTE) {
    return reply(429, { ok: false, error: 'rate_limited' });
  }

  // 5. Cuota mensual (se descuenta antes y se devuelve si la IA falla).
  const month = monthKey(new Date());
  const { data: used } = await admin.rpc('try_consume_quota', {
    p_user: userId,
    p_month: month,
    p_kind: 'recipe',
    p_limit: RECIPE_LIMIT,
  });
  if (typeof used !== 'number' || used < 0) {
    return reply(429, { ok: false, error: 'quota' });
  }

  // 6. IA, con un reintento si la respuesta no se pudo validar.
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { recipe, usage } = await callAi(request);
      await logUsage(userId, usage);
      if (recipe) {
        await admin.from('generated_recipes').upsert({ cache_key: key, recipe });
        return reply(200, {
          ok: true,
          recipe,
          recipesLeft: Math.max(0, RECIPE_LIMIT - used),
          cached: false,
        });
      }
    }
  } catch (error) {
    console.error(
      'generate-recipe: falla de IA',
      error instanceof Error ? error.name : 'desconocido',
    );
  }
  await admin.rpc('release_quota', { p_user: userId, p_month: month, p_kind: 'recipe' });
  return reply(502, { ok: false, error: 'ai_failed' });
});
