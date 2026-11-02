// Producto de inventario de prueba (solo para tests).
import { getCatalogProduct } from '@/features/catalog/catalog';

import type { InventoryItem } from './inventory-repo';

let counter = 0;

export function makeItem(
  productId: string,
  expiresAt: string,
  extra: Partial<InventoryItem> = {},
): InventoryItem {
  counter += 1;
  return {
    id: `i-${counter}`,
    productId,
    displayName: getCatalogProduct(productId)?.name ?? productId,
    quantity: 1,
    unit: 'un',
    location: 'fridge',
    priceClp: null,
    purchasedAt: '2026-10-30',
    expiresAt,
    latestAt: null,
    expirySource: 'estimated',
    dateType: 'best_before',
    openedAt: null,
    frozenAt: null,
    thawedAt: null,
    status: 'active',
    discardReason: null,
    receiptId: null,
    notes: null,
    closedAt: null,
    createdAt: '',
    updatedAt: '',
    ...extra,
  };
}
