// Modelo de recetas. La dieta (vegetariana, vegana) y los alérgenos se calculan desde los
// ingredientes, así no dependen de etiquetas escritas a mano.

import recipesData from '@/data/recipes.json';
import { getCatalogProduct } from '@/features/catalog/catalog';
import { normalizeForSearch } from '@/lib/text';

export const EQUIPMENT = [
  'olla',
  'sarten',
  'horno',
  'microondas',
  'licuadora',
  'freidora-aire',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const ALLERGENS = [
  'gluten',
  'lactosa',
  'huevo',
  'pescado',
  'mariscos',
  'frutos-secos',
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const DIETS = ['none', 'vegetarian', 'vegan'] as const;
export type Diet = (typeof DIETS)[number];

export type RecipeIngredient = {
  /** Producto del catálogo, una lista de alternativas, o null para básicos (especias, agua). */
  p: string | string[] | null;
  /** Nombre para mostrar. */
  n: string;
  q: number;
  u: string;
  /** Opcional: la receta funciona sin él. */
  o?: boolean;
};

export type Recipe = {
  id: string;
  t: string;
  /** Porciones. */
  s: number;
  /** Minutos aproximados. */
  m: number;
  /** Dificultad 1 a 3. */
  d: number;
  tags: string[];
  /** Equipamiento necesario. */
  e: string[];
  i: RecipeIngredient[];
  st: string[];
  source: 'base' | 'user' | 'ai';
};

const ALLERGENS_BY_PRODUCT: Record<string, Allergen[]> = {
  harina: ['gluten'],
  fideos: ['gluten'],
  'fideos-cocidos': ['gluten'],
  marraqueta: ['gluten'],
  hallulla: ['gluten'],
  'pan-amasado': ['gluten'],
  'pan-molde': ['gluten'],
  tortillas: ['gluten'],
  'pan-rallado': ['gluten'],
  avena: ['gluten'],
  cereal: ['gluten'],
  galletas: ['gluten'],
  kuchen: ['gluten', 'lactosa', 'huevo'],
  torta: ['gluten', 'lactosa', 'huevo'],
  pizza: ['gluten', 'lactosa'],
  empanadas: ['gluten'],
  'leche-fresca': ['lactosa'],
  'leche-larga-vida': ['lactosa'],
  yogur: ['lactosa'],
  'leche-cultivada': ['lactosa'],
  'leche-polvo': ['lactosa'],
  'leche-condensada': ['lactosa'],
  mantequilla: ['lactosa'],
  crema: ['lactosa'],
  manjar: ['lactosa'],
  helado: ['lactosa'],
  'queso-gauda': ['lactosa'],
  'queso-mantecoso': ['lactosa'],
  'queso-parmesano': ['lactosa'],
  'queso-fresco': ['lactosa'],
  quesillo: ['lactosa'],
  'queso-crema': ['lactosa'],
  ricotta: ['lactosa'],
  huevos: ['huevo'],
  mayonesa: ['huevo'],
  'pescado-fresco': ['pescado'],
  'pescado-congelado': ['pescado'],
  salmon: ['pescado'],
  atun: ['pescado'],
  jurel: ['pescado'],
  mariscos: ['mariscos'],
  'frutos-secos': ['frutos-secos'],
};

const MEAT_CATEGORIES = ['carnes', 'aves', 'embutidos', 'pescados'];
const ANIMAL_CATEGORIES = [...MEAT_CATEGORIES, 'lacteos', 'quesos', 'huevos'];
const ANIMAL_PRODUCTS = ['mayonesa', 'atun', 'jurel', 'pescado-congelado', 'hamburguesas'];

export function productIdsOf(ingredient: RecipeIngredient): string[] {
  if (ingredient.p === null) {
    return [];
  }
  return Array.isArray(ingredient.p) ? ingredient.p : [ingredient.p];
}

/** Alérgenos de un ingrediente básico sin producto (por ejemplo, "salsa de soya", "pan de completo"). */
function allergensFromName(name: string): Allergen[] {
  const n = normalizeForSearch(name);
  const found: Allergen[] = [];
  if (/\bpan\b|soya/.test(n)) {
    found.push('gluten');
  }
  return found;
}

/**
 * Alérgenos de una receta: solo cuentan los ingredientes obligatorios, y cuando hay alternativas
 * solo si todas las tienen (por ejemplo, "leche o leche sin lactosa" no marca lactosa).
 */
export function recipeAllergens(recipe: Pick<Recipe, 'i'>): Allergen[] {
  const result = new Set<Allergen>();
  for (const ingredient of recipe.i) {
    if (ingredient.o) {
      continue;
    }
    const ids = productIdsOf(ingredient);
    if (ids.length === 0) {
      allergensFromName(ingredient.n).forEach((a) => result.add(a));
      continue;
    }
    for (const allergen of ALLERGENS) {
      if (ids.every((id) => ALLERGENS_BY_PRODUCT[id]?.includes(allergen))) {
        result.add(allergen);
      }
    }
  }
  return ALLERGENS.filter((a) => result.has(a));
}

function every(ingredient: RecipeIngredient, predicate: (id: string) => boolean): boolean {
  const ids = productIdsOf(ingredient);
  return ids.length > 0 && ids.every(predicate);
}

function categoryOf(id: string): string | undefined {
  return getCatalogProduct(id)?.categoryId;
}

export function isVegetarian(recipe: Pick<Recipe, 'i'>): boolean {
  return !recipe.i.some(
    (ing) =>
      !ing.o &&
      every(
        ing,
        (id) =>
          MEAT_CATEGORIES.includes(categoryOf(id) ?? '') ||
          id === 'atun' ||
          id === 'jurel' ||
          id === 'hamburguesas',
      ),
  );
}

export function isVegan(recipe: Pick<Recipe, 'i'>): boolean {
  return !recipe.i.some(
    (ing) =>
      !ing.o &&
      every(
        ing,
        (id) => ANIMAL_CATEGORIES.includes(categoryOf(id) ?? '') || ANIMAL_PRODUCTS.includes(id),
      ),
  );
}

export function fitsDiet(recipe: Pick<Recipe, 'i'>, diet: Diet): boolean {
  if (diet === 'vegan') {
    return isVegan(recipe);
  }
  if (diet === 'vegetarian') {
    return isVegetarian(recipe);
  }
  return true;
}

const baseRecipes: Recipe[] = (recipesData.recipes as Omit<Recipe, 'source'>[]).map((r) => ({
  ...r,
  source: 'base' as const,
}));

export function allBaseRecipes(): readonly Recipe[] {
  return baseRecipes;
}

export function getBaseRecipe(id: string): Recipe | undefined {
  return baseRecipes.find((r) => r.id === id);
}
