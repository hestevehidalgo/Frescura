// Ranking local de recetas: corre en el celular, sin IA.
// Puntaje = urgencia de lo que vence pronto que usa + proporción de ingredientes que tienes
//           − penalización por ingredientes que faltan.

import type { InventoryItem } from '@/db/inventory-repo';
import { getCatalogProduct } from '@/features/catalog/catalog';
import { daysBetween, type IsoDate } from '@/lib/dates';

import {
  fitsDiet,
  productIdsOf,
  recipeAllergens,
  type Allergen,
  type Diet,
  type Recipe,
  type RecipeIngredient,
} from './recipes';

export type RecipePreferences = {
  diet: Diet;
  avoid: Allergen[];
  equipment: string[];
  /** Básicos que "siempre tengo" (ids del catálogo). */
  pantryBasics: string[];
};

export type IngredientMatch = {
  ingredient: RecipeIngredient;
  /** Producto del inventario que se usaría (el que vence antes), si hay. */
  item: InventoryItem | null;
  /** Lo tienes como básico de despensa o es un básico sin producto (especias, agua). */
  basic: boolean;
};

export type RankedRecipe = {
  recipe: Recipe;
  score: number;
  matches: IngredientMatch[];
  /** Productos del inventario que vencen en 7 días o menos y que la receta usa. */
  expiring: InventoryItem[];
  /** Ingredientes obligatorios que faltan. */
  missing: RecipeIngredient[];
};

const WEEK = 7;
const MISSING_PENALTY = 3;
const OWNED_WEIGHT = 3;

// Categorías del ingrediente principal: si falta, la receta casi no se puede hacer.
const MAIN_CATEGORIES = new Set(['carnes', 'aves', 'pescados']);
// Proteínas crudas que el catálogo guarda en otras categorías. El pollo asado no: se compra listo
// en cualquier supermercado, así que falta "normal".
const MAIN_PRODUCTS = new Set(['hamburguesas', 'pescado-congelado', 'longaniza', 'chorizo']);

/** Lo que pesa que falte un ingrediente: el doble si es la carne, el pollo o el pescado. */
export function missingCost(ingredient: RecipeIngredient): number {
  const main = productIdsOf(ingredient).some(
    (id) => MAIN_PRODUCTS.has(id) || MAIN_CATEGORIES.has(getCatalogProduct(id)?.categoryId ?? ''),
  );
  return main ? 2 : 1;
}

/** Peso por urgencia: lo que vence antes pesa más. Lo vencido no se sugiere cocinar. */
export function urgencyWeight(item: InventoryItem, today: IsoDate): number {
  if (item.location === 'freezer') {
    return 0;
  }
  const days = daysBetween(today, item.expiresAt);
  if (days < 0) {
    return 0;
  }
  if (days === 0) {
    return 5;
  }
  if (days <= 3) {
    return 4;
  }
  if (days <= WEEK) {
    return 2;
  }
  return 0;
}

function usableItems(items: InventoryItem[], today: IsoDate): InventoryItem[] {
  // Nunca se sugiere cocinar algo ya vencido.
  return items.filter(
    (item) => item.status === 'active' && daysBetween(today, item.expiresAt) >= 0,
  );
}

export function allowedByPreferences(recipe: Recipe, prefs: RecipePreferences): boolean {
  if (!fitsDiet(recipe, prefs.diet)) {
    return false;
  }
  const allergens = recipeAllergens(recipe);
  if (prefs.avoid.some((a) => allergens.includes(a))) {
    return false;
  }
  return recipe.e.every((e) => prefs.equipment.includes(e));
}

export function scoreRecipe(
  recipe: Recipe,
  items: InventoryItem[],
  today: IsoDate,
  pantryBasics: string[],
): RankedRecipe {
  const byProduct = new Map<string, InventoryItem[]>();
  for (const item of usableItems(items, today)) {
    byProduct.set(item.productId, [...(byProduct.get(item.productId) ?? []), item]);
  }
  const used = new Set<string>();
  const matches: IngredientMatch[] = recipe.i.map((ingredient) => {
    const ids = productIdsOf(ingredient);
    if (ids.length === 0) {
      return { ingredient, item: null, basic: true };
    }
    // De todas las alternativas, el lote que vence antes y que no se usó para otro ingrediente.
    const candidates = ids
      .flatMap((id) => byProduct.get(id) ?? [])
      .filter((item) => !used.has(item.id))
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
    const item = candidates[0] ?? null;
    if (item) {
      used.add(item.id);
      return { ingredient, item, basic: false };
    }
    return { ingredient, item: null, basic: ids.some((id) => pantryBasics.includes(id)) };
  });

  const required = matches.filter((m) => !m.ingredient.o && productIdsOf(m.ingredient).length > 0);
  const owned = required.filter((m) => m.item || m.basic);
  const missing = required.filter((m) => !m.item && !m.basic).map((m) => m.ingredient);
  const expiring = matches
    .map((m) => m.item)
    .filter((item): item is InventoryItem => item !== null && urgencyWeight(item, today) > 0);

  const urgency = expiring.reduce((sum, item) => sum + urgencyWeight(item, today), 0);
  const ownedFraction = required.length === 0 ? 1 : owned.length / required.length;
  const missingWeight = missing.reduce((sum, ingredient) => sum + missingCost(ingredient), 0);
  const score = urgency + OWNED_WEIGHT * ownedFraction - MISSING_PENALTY * missingWeight;

  return { recipe, score: Math.round(score * 100) / 100, matches, expiring, missing };
}

/** Recetas permitidas por las preferencias, de la más conveniente a la menos. */
export function rankRecipes(
  recipes: readonly Recipe[],
  items: InventoryItem[],
  today: IsoDate,
  prefs: RecipePreferences,
): RankedRecipe[] {
  return recipes
    .filter((recipe) => allowedByPreferences(recipe, prefs))
    .map((recipe) => scoreRecipe(recipe, items, today, prefs.pantryBasics))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.missing.length - b.missing.length ||
        a.recipe.t.localeCompare(b.recipe.t, 'es'),
    );
}
