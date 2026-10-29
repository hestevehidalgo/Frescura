import categoriesData from '@/data/categories.json';
import catalogData from '@/data/catalog.json';
import { type Unit } from '@/lib/quantity';
import { normalizeForSearch } from '@/lib/text';

export const LOCATIONS = ['fridge', 'freezer', 'pantry'] as const;
export type Location = (typeof LOCATIONS)[number];

export type Risk = 'low' | 'medium' | 'high';
export type DateType = 'use_by' | 'best_before';
/** Rango de días [mínimo, máximo]. */
export type DayRange = [number, number];

type ShelfLifeFields = {
  pantry?: DayRange;
  fridge?: DayRange;
  freezer?: DayRange;
  pantryOpened?: DayRange;
  fridgeOpened?: DayRange;
  thawed?: DayRange;
};

export type Category = ShelfLifeFields & {
  id: string;
  name: string;
  emoji: string;
  risk: Risk;
  storage: Location;
  dateType?: DateType;
  longLife?: boolean;
  freshStrict?: boolean;
  cooked?: boolean;
};

type RawProduct = ShelfLifeFields & {
  id: string;
  name: string;
  emoji: string;
  category: string;
  unit: string;
  storage?: Location;
  risk?: Risk;
  dateType?: DateType;
  longLife?: boolean;
  freshStrict?: boolean;
  cooked?: boolean;
  quick?: boolean;
  aliases?: string[];
  ripeness?: { storage: Location; range: DayRange };
};

/** Producto con los valores de su categoría ya aplicados. */
export type Product = Required<Pick<ShelfLifeFields, 'thawed'>> &
  Omit<ShelfLifeFields, 'thawed'> & {
    id: string;
    name: string;
    emoji: string;
    categoryId: string;
    unit: Unit;
    storage: Location;
    risk: Risk;
    dateType: DateType;
    longLife: boolean;
    /** Lácteos frescos: su vida útil nunca se alarga automáticamente. */
    freshStrict: boolean;
    cooked: boolean;
    quick: boolean;
    aliases: string[];
    ripeness?: { storage: Location; range: DayRange };
  };

const categories = categoriesData.categories as Category[];
const categoryById = new Map(categories.map((c) => [c.id, c]));

const DEFAULT_THAWED: DayRange = [1, 2];

function requireCategory(id: string): Category {
  const category = categoryById.get(id);
  if (!category) {
    throw new Error(`Categoría desconocida: ${id}`);
  }
  return category;
}

export function resolveProduct(raw: RawProduct): Product {
  const c = requireCategory(raw.category);
  return {
    id: raw.id,
    name: raw.name,
    emoji: raw.emoji,
    categoryId: c.id,
    unit: raw.unit as Unit,
    storage: raw.storage ?? c.storage,
    risk: raw.risk ?? c.risk,
    dateType:
      raw.dateType ?? c.dateType ?? ((raw.risk ?? c.risk) === 'high' ? 'use_by' : 'best_before'),
    longLife: raw.longLife ?? c.longLife ?? false,
    freshStrict: raw.freshStrict ?? c.freshStrict ?? false,
    cooked: raw.cooked ?? c.cooked ?? false,
    quick: raw.quick ?? false,
    aliases: raw.aliases ?? [],
    ripeness: raw.ripeness,
    pantry: raw.pantry ?? c.pantry,
    fridge: raw.fridge ?? c.fridge,
    freezer: raw.freezer ?? c.freezer,
    pantryOpened: raw.pantryOpened ?? c.pantryOpened,
    fridgeOpened: raw.fridgeOpened ?? c.fridgeOpened,
    thawed: raw.thawed ?? c.thawed ?? DEFAULT_THAWED,
  };
}

const products = (catalogData.products as RawProduct[]).map(resolveProduct);
const productById = new Map(products.map((p) => [p.id, p]));

export function allCategories(): readonly Category[] {
  return categories;
}

export function getCategory(id: string): Category | undefined {
  return categoryById.get(id);
}

export function allProducts(): readonly Product[] {
  return products;
}

export function getCatalogProduct(id: string): Product | undefined {
  return productById.get(id);
}

/** Los productos de la grilla de "agregar rápido", en el orden del catálogo. */
export function quickProducts(): readonly Product[] {
  return products.filter((p) => p.quick);
}

/**
 * Producto genérico para algo que no está en el catálogo (lo escribió el usuario o vino de
 * Open Food Facts): toma todo de la categoría.
 */
export function genericProduct(id: string, name: string, categoryId: string, unit: Unit): Product {
  const c = requireCategory(categoryId);
  return resolveProduct({ id, name, emoji: c.emoji, category: c.id, unit });
}

/**
 * Busca en el catálogo por nombre o alias, sin importar tildes ni mayúsculas.
 * Primero lo que empieza con el texto, luego lo que lo contiene.
 */
export function searchCatalog(query: string, limit = 8): Product[] {
  const q = normalizeForSearch(query);
  if (!q) {
    return [];
  }
  const scored: { product: Product; score: number }[] = [];
  for (const product of products) {
    const names = [product.name, ...product.aliases].map(normalizeForSearch);
    let score = 0;
    for (const name of names) {
      if (name === q) {
        score = Math.max(score, 3);
      } else if (name.startsWith(q) || name.split(' ').some((w) => w.startsWith(q))) {
        score = Math.max(score, 2);
      } else if (name.includes(q)) {
        score = Math.max(score, 1);
      }
    }
    if (score > 0) {
      scored.push({ product, score });
    }
  }
  return scored
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'es'))
    .slice(0, limit)
    .map((s) => s.product);
}
