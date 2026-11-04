// Recetas inventadas por la IA (función generate-recipe). Solo se envían nombres genéricos de
// ingredientes y las preferencias de cocina; nada que identifique a la persona.

import { FunctionsHttpError } from '@supabase/supabase-js';

import type { InventoryItem } from '@/db/inventory-repo';
import { fingerprint } from '@/lib/hash';
import { getSignedInSupabase } from '@/lib/supabase';
import type { IsoDate } from '@/lib/dates';

import type {
  AiRecipe,
  GenerateRecipeResponse,
  RecipeRequest,
} from '../../../supabase/functions/generate-recipe/logic';
import { urgencyWeight, type RecipePreferences } from './ranking';
import type { Recipe } from './recipes';
import { catalogIdFor } from './user-recipe';

/** Pocos ingredientes = más coincidencias en el caché compartido = menos gasto. */
const MAX_AI_INGREDIENTS = 6;

export type AiRecipeResult =
  | GenerateRecipeResponse
  | { ok: false; error: 'offline' | 'not_configured' | 'server' | 'not_enough' };

/**
 * Pide receta con lo que vence antes (sin congelados ni vencidos). Los nombres son los del
 * catálogo ("Carne molida"), no los de la boleta, para no mandar marcas ni detalles.
 */
export function buildRecipeRequest(
  items: InventoryItem[],
  today: IsoDate,
  prefs: RecipePreferences,
  nameOf: (item: InventoryItem) => string,
): RecipeRequest | null {
  const names: string[] = [];
  const usable = items
    .filter((item) => item.location !== 'freezer' && item.expiresAt >= today)
    .sort(
      (a, b) =>
        urgencyWeight(b, today) - urgencyWeight(a, today) || a.expiresAt.localeCompare(b.expiresAt),
    );
  for (const item of usable) {
    const name = nameOf(item).trim().toLowerCase();
    if (name && !names.includes(name)) {
      names.push(name);
    }
    if (names.length >= MAX_AI_INGREDIENTS) {
      break;
    }
  }
  if (names.length < 2) {
    return null;
  }
  return {
    ingredients: names,
    diet: prefs.diet,
    avoid: prefs.avoid,
    equipment: prefs.equipment as RecipeRequest['equipment'],
    servings: 2,
  };
}

/** Convierte la respuesta de la IA en una receta de la app, enlazada con el catálogo. */
export function aiRecipeToRecipe(ai: AiRecipe): Recipe {
  return {
    id: `ai-${fingerprint(JSON.stringify([ai.t, ai.i, ai.st]))}`,
    t: ai.t,
    s: ai.s,
    m: ai.m,
    d: ai.d,
    tags: ai.tags,
    e: ai.e,
    i: ai.i.map((ingredient) => ({ ...ingredient, p: catalogIdFor(ingredient.n) })),
    st: ai.st,
    source: 'ai',
  };
}

export async function requestAiRecipe(request: RecipeRequest): Promise<AiRecipeResult> {
  let supabase;
  try {
    supabase = await getSignedInSupabase();
  } catch {
    return { ok: false, error: 'offline' };
  }
  if (!supabase) {
    return { ok: false, error: 'not_configured' };
  }
  const { data, error } = await supabase.functions.invoke<GenerateRecipeResponse>(
    'generate-recipe',
    { body: request },
  );
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        return (await (error.context as Response).json()) as GenerateRecipeResponse;
      } catch {
        return { ok: false, error: 'server' };
      }
    }
    return { ok: false, error: 'offline' };
  }
  return data ?? { ok: false, error: 'server' };
}

/** Mensaje de error para mostrar. */
export function aiErrorKey(
  error: Extract<AiRecipeResult, { ok: false }>['error'],
):
  | 'recipes.aiErrors.quota'
  | 'recipes.aiErrors.offline'
  | 'recipes.aiErrors.not_configured'
  | 'recipes.aiErrors.rate_limited'
  | 'recipes.aiErrors.busy'
  | 'recipes.aiErrors.not_enough'
  | 'recipes.aiErrors.failed' {
  switch (error) {
    case 'quota':
    case 'offline':
    case 'not_configured':
    case 'rate_limited':
    case 'busy':
    case 'not_enough':
      return `recipes.aiErrors.${error}`;
    default:
      return 'recipes.aiErrors.failed';
  }
}
