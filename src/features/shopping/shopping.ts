// Lista de compras: lo que ya tienes en casa y lo que falta para una receta.

import type { InventoryItem } from '@/db/inventory-repo';
import type { NewShoppingItem, ShoppingItem } from '@/db/shopping-repo';
import { matchCatalog } from '@/features/catalog/catalog';
import { productIdsOf, type RecipeIngredient } from '@/features/recipes/recipes';
import { scaleAmount } from '@/features/recipes/servings';
import { capitalize } from '@/lib/text';

export type AlreadyHave = { quantity: number; unit: string; expiresAt: string; lots: number };

/** "Ya tienes esto": lo que hay en el inventario del mismo producto (para no comprar repetido). */
export function alreadyHave(
  entry: Pick<ShoppingItem, 'name' | 'productId'>,
  items: InventoryItem[],
): AlreadyHave | null {
  const productId = entry.productId ?? matchCatalog(entry.name)?.id ?? null;
  if (!productId) {
    return null;
  }
  const same = items.filter((i) => i.status === 'active' && i.productId === productId);
  const first = [...same].sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))[0];
  if (!first) {
    return null;
  }
  const quantity = same
    .filter((i) => i.unit === first.unit)
    .reduce((sum, i) => sum + i.quantity, 0);
  return {
    quantity: Math.round(quantity * 1000) / 1000,
    unit: first.unit,
    expiresAt: first.expiresAt,
    lots: same.length,
  };
}

/** Lo que falta para una receta, listo para la lista de compras (con las porciones elegidas). */
export function missingToShopping(missing: RecipeIngredient[], factor = 1): NewShoppingItem[] {
  return missing.map((ingredient) => ({
    name: capitalize(ingredient.n),
    productId: productIdsOf(ingredient)[0] ?? null,
    quantity: scaleAmount(ingredient.q, ingredient.u, factor),
    unit: ingredient.u,
    source: 'recipe' as const,
  }));
}

/** Un texto escrito a mano ("2 limones") → nombre y producto del catálogo. */
export function shoppingFromText(text: string): NewShoppingItem | null {
  const name = text.trim().replace(/\s+/g, ' ');
  if (name.length < 2) {
    return null;
  }
  return { name: capitalize(name), productId: matchCatalog(name)?.id ?? null, source: 'manual' };
}
