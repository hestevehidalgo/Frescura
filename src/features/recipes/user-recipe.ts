// Recetas escritas por la persona: se interpretan líneas como "500 g carne molida" o "2 cebollas"
// y se enlazan con el catálogo para que el ranking sepa qué productos usan.

import { matchCatalog } from '@/features/catalog/catalog';
import { normalizeForSearch } from '@/lib/text';

import type { Recipe, RecipeIngredient } from './recipes';

const UNIT_ALIASES: Record<string, string> = {
  g: 'g',
  gr: 'g',
  grs: 'g',
  gramo: 'g',
  gramos: 'g',
  kg: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  l: 'l',
  lt: 'l',
  lts: 'l',
  litro: 'l',
  litros: 'l',
  ml: 'ml',
  cc: 'ml',
  cda: 'cda',
  cdas: 'cda',
  cucharada: 'cda',
  cucharadas: 'cda',
  cdta: 'cdta',
  cdtas: 'cdta',
  cucharadita: 'cdta',
  cucharaditas: 'cdta',
  taza: 'taza',
  tazas: 'taza',
  un: 'un',
  unidad: 'un',
  unidades: 'un',
};

/** "1/2" → 0,5; "1,5" → 1,5; "2" → 2. */
function parseAmount(text: string): number | null {
  const fraction = /^(\d+)\/(\d+)$/.exec(text);
  if (fraction) {
    const den = Number(fraction[2]);
    return den > 0 ? Number(fraction[1]) / den : null;
  }
  return /^\d+([.,]\d+)?$/.test(text) ? Number(text.replace(',', '.')) : null;
}

/** Producto del catálogo para un nombre, probando también el singular ("cebollas" → cebolla). */
export function catalogIdFor(name: string): string | null {
  const direct = matchCatalog(name);
  if (direct) {
    return direct.id;
  }
  const words = normalizeForSearch(name).split(' ');
  const first = words[0] ?? '';
  const singulars = [first.replace(/es$/, ''), first.replace(/s$/, '')].filter(
    (w) => w.length >= 3 && w !== first,
  );
  for (const singular of singulars) {
    const match = matchCatalog([singular, ...words.slice(1)].join(' '));
    if (match) {
      return match.id;
    }
  }
  return null;
}

/** "500 g carne molida" → { n: 'carne molida', q: 500, u: 'g', p: 'carne-molida' } */
export function parseIngredientLine(line: string): RecipeIngredient | null {
  const words = line.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (words.length === 0) {
    return null;
  }
  let q = 1;
  let u = 'un';
  const amount = parseAmount(words[0] ?? '');
  if (amount !== null && amount > 0) {
    q = Math.round(amount * 1000) / 1000;
    words.shift();
    const unit = UNIT_ALIASES[normalizeForSearch(words[0] ?? '')];
    if (unit && words.length > 1) {
      u = unit;
      words.shift();
      if (normalizeForSearch(words[0] ?? '') === 'de' && words.length > 1) {
        words.shift();
      }
    }
  }
  const n = words.join(' ').slice(0, 60);
  if (n.length < 2) {
    return null;
  }
  return { p: catalogIdFor(n), n, q, u };
}

export type UserRecipeDraft = {
  title: string;
  servings: number;
  ingredientsText: string;
  stepsText: string;
};

/** Arma la receta desde el formulario. Devuelve null si falta nombre, ingredientes o pasos. */
export function buildUserRecipe(draft: UserRecipeDraft, id: string): Recipe | null {
  const title = draft.title.trim().slice(0, 80);
  const ingredients = draft.ingredientsText
    .split('\n')
    .map(parseIngredientLine)
    .filter((i): i is RecipeIngredient => i !== null);
  const steps = draft.stepsText
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (!title || ingredients.length === 0 || steps.length === 0) {
    return null;
  }
  return {
    id,
    t: title,
    s: Math.min(12, Math.max(1, Math.round(draft.servings))),
    m: 30,
    d: 1,
    tags: [],
    e: [],
    i: ingredients,
    st: steps,
    source: 'user',
  };
}
