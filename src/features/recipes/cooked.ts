// "Cociné esta receta": qué descontar del inventario según lo que la persona dice que usó.

import type { InventoryItem } from '@/db/inventory-repo';
import type { ItemAction } from '@/features/inventory/service';

import type { IngredientMatch } from './ranking';

export type UsedAmount = 'all' | 'half' | 'none';

/** Productos del inventario que usa la receta, sin repetir (dos ingredientes pueden ser el mismo). */
export function itemsUsedBy(matches: IngredientMatch[]): InventoryItem[] {
  const seen = new Set<string>();
  const items: InventoryItem[] = [];
  for (const match of matches) {
    if (match.item && !seen.has(match.item.id)) {
      seen.add(match.item.id);
      items.push(match.item);
    }
  }
  return items;
}

/** Acciones de consumo para cada producto según lo usado. "Nada" no genera acción. */
export function cookedActions(
  items: InventoryItem[],
  used: Record<string, UsedAmount>,
): { item: InventoryItem; action: ItemAction }[] {
  const actions: { item: InventoryItem; action: ItemAction }[] = [];
  for (const item of items) {
    const amount = used[item.id] ?? 'all';
    if (amount === 'all') {
      actions.push({ item, action: { type: 'consume' } });
    } else if (amount === 'half') {
      const half = Math.round((item.quantity / 2) * 1000) / 1000;
      actions.push({ item, action: { type: 'consume', quantity: half } });
    }
  }
  return actions;
}
