// Datos para las estadísticas: todos los productos (también los cerrados) y sus eventos.
// Se leen de una vez; un inventario de un hogar tiene a lo más unos miles de filas.

import type { StatsData, StatsEvent, StatsItem } from '@/features/stats/stats';
import { canonicalStore } from '@/features/stats/stores';

import type { Db } from './db';
import { listItems, type EventType, type InventoryItem } from './inventory-repo';

export async function loadStatsData(db: Db): Promise<StatsData> {
  const statuses = ['active', 'consumed', 'discarded', 'unknown'] as const;
  const lists = await Promise.all(statuses.map((s) => listItems(db, s)));
  const stores = await db.getAllAsync<{ id: string; chain: string | null }>(
    'SELECT id, chain FROM receipts',
  );
  const storeOf = new Map(stores.map((r) => [r.id, r.chain]));
  const items: StatsItem[] = lists.flat().map((item: InventoryItem) => ({
    ...item,
    store: item.receiptId ? canonicalStore(storeOf.get(item.receiptId) ?? null) : null,
  }));
  const rows = await db.getAllAsync<{
    item_id: string;
    type: EventType;
    quantity_delta: number;
    at: string;
    expires_before: string | null;
    split_child: string | null;
  }>(
    `SELECT item_id, type, quantity_delta, at,
            json_extract(snapshot, '$.item.expiresAt') AS expires_before,
            json_extract(snapshot, '$.createdItemId') AS split_child
       FROM item_events
      WHERE type IN ('added', 'consumed', 'discarded', 'split')
      ORDER BY at`,
  );
  const events: StatsEvent[] = rows.map((r) => ({
    itemId: r.item_id,
    type: r.type as StatsEvent['type'],
    quantityDelta: r.quantity_delta,
    at: r.at,
    expiresBefore: r.expires_before,
    splitChild: r.split_child,
  }));
  return { items, events };
}
