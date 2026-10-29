import type { DateType, Location } from '@/features/catalog/catalog';
import type { ExpirySource } from '@/features/expiry/expiry';
import type { IsoDate } from '@/lib/dates';
import type { Unit } from '@/lib/quantity';

import { newId, nowTimestamp, type BindValue, type Db } from './db';

export type ItemStatus = 'active' | 'consumed' | 'discarded' | 'unknown';
export type DiscardReason = 'spoiled' | 'disliked' | 'leftover';

export type InventoryItem = {
  id: string;
  productId: string;
  displayName: string;
  quantity: number;
  unit: Unit;
  location: Location;
  priceClp: number | null;
  purchasedAt: IsoDate;
  expiresAt: IsoDate;
  latestAt: IsoDate | null;
  expirySource: ExpirySource;
  dateType: DateType;
  openedAt: IsoDate | null;
  frozenAt: IsoDate | null;
  thawedAt: IsoDate | null;
  status: ItemStatus;
  discardReason: DiscardReason | null;
  receiptId: string | null;
  notes: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewItem = Omit<
  InventoryItem,
  'id' | 'status' | 'discardReason' | 'closedAt' | 'createdAt' | 'updatedAt'
> & { id?: string };

export type ItemPatch = Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>>;

export type EventType =
  | 'added'
  | 'opened'
  | 'frozen'
  | 'thawed'
  | 'consumed'
  | 'discarded'
  | 'edited'
  | 'moved'
  | 'unknown'
  | 'split';

export type ItemEvent = {
  id: string;
  itemId: string;
  type: EventType;
  quantityDelta: number;
  at: string;
};

type Snapshot = { item: InventoryItem; createdItemId?: string };

// Columnas en el mismo orden que InventoryItem.
const COLUMNS: [keyof InventoryItem, string][] = [
  ['id', 'id'],
  ['productId', 'product_id'],
  ['displayName', 'display_name'],
  ['quantity', 'quantity'],
  ['unit', 'unit'],
  ['location', 'location'],
  ['priceClp', 'price_clp'],
  ['purchasedAt', 'purchased_at'],
  ['expiresAt', 'expires_at'],
  ['latestAt', 'latest_at'],
  ['expirySource', 'expiry_source'],
  ['dateType', 'date_type'],
  ['openedAt', 'opened_at'],
  ['frozenAt', 'frozen_at'],
  ['thawedAt', 'thawed_at'],
  ['status', 'status'],
  ['discardReason', 'discard_reason'],
  ['receiptId', 'receipt_id'],
  ['notes', 'notes'],
  ['closedAt', 'closed_at'],
  ['createdAt', 'created_at'],
  ['updatedAt', 'updated_at'],
];
const COLUMN_OF = new Map(COLUMNS);
const SELECT_ITEM = `SELECT ${COLUMNS.map(([, c]) => c).join(', ')} FROM inventory_items`;

function rowToItem(row: Record<string, BindValue>): InventoryItem {
  const item: Record<string, BindValue> = {};
  for (const [key, column] of COLUMNS) {
    item[key] = row[column] ?? null;
  }
  return item as unknown as InventoryItem;
}

async function insertRow(db: Db, item: InventoryItem): Promise<void> {
  const placeholders = COLUMNS.map(() => '?').join(', ');
  await db.runAsync(
    `INSERT INTO inventory_items (${COLUMNS.map(([, c]) => c).join(', ')}) VALUES (${placeholders})`,
    COLUMNS.map(([key]) => item[key] as BindValue),
  );
}

async function insertEvent(
  db: Db,
  itemId: string,
  type: EventType,
  quantityDelta: number,
  at: string,
  snapshot: Snapshot | null,
): Promise<string> {
  const id = newId();
  await db.runAsync(
    'INSERT INTO item_events (id, item_id, type, quantity_delta, at, snapshot) VALUES (?, ?, ?, ?, ?, ?)',
    [id, itemId, type, quantityDelta, at, snapshot ? JSON.stringify(snapshot) : null],
  );
  return id;
}

export async function insertItem(db: Db, input: NewItem, now = new Date()): Promise<InventoryItem> {
  const at = nowTimestamp(now);
  const item: InventoryItem = {
    ...input,
    id: input.id ?? newId(),
    status: 'active',
    discardReason: null,
    closedAt: null,
    createdAt: at,
    updatedAt: at,
  };
  await db.withTransactionAsync(async () => {
    await insertRow(db, item);
    await insertEvent(db, item.id, 'added', item.quantity, at, null);
  });
  return item;
}

export async function getItem(db: Db, id: string): Promise<InventoryItem | null> {
  const row = await db.getFirstAsync<Record<string, BindValue>>(`${SELECT_ITEM} WHERE id = ?`, [
    id,
  ]);
  return row ? rowToItem(row) : null;
}

export async function listItems(db: Db, status: ItemStatus = 'active'): Promise<InventoryItem[]> {
  const rows = await db.getAllAsync<Record<string, BindValue>>(
    `${SELECT_ITEM} WHERE status = ? ORDER BY expires_at, display_name`,
    [status],
  );
  return rows.map(rowToItem);
}

export async function listEvents(db: Db, itemId: string): Promise<ItemEvent[]> {
  const rows = await db.getAllAsync<{
    id: string;
    item_id: string;
    type: EventType;
    quantity_delta: number;
    at: string;
  }>(
    'SELECT id, item_id, type, quantity_delta, at FROM item_events WHERE item_id = ? ORDER BY at, rowid',
    [itemId],
  );
  return rows.map((r) => ({
    id: r.id,
    itemId: r.item_id,
    type: r.type,
    quantityDelta: r.quantity_delta,
    at: r.at,
  }));
}

async function writePatch(db: Db, id: string, patch: ItemPatch, at: string): Promise<void> {
  const entries = Object.entries(patch).filter(([key]) =>
    COLUMN_OF.has(key as keyof InventoryItem),
  );
  const sets = entries.map(([key]) => `${COLUMN_OF.get(key as keyof InventoryItem)} = ?`);
  await db.runAsync(
    `UPDATE inventory_items SET ${[...sets, 'updated_at = ?'].join(', ')} WHERE id = ?`,
    [...entries.map(([, value]) => (value ?? null) as BindValue), at, id],
  );
}

/**
 * Aplica un cambio y registra el evento con una foto del estado anterior, para poder deshacerlo.
 * Devuelve el id del evento.
 */
export async function updateItem(
  db: Db,
  id: string,
  patch: ItemPatch,
  event: { type: EventType; quantityDelta?: number },
  now = new Date(),
): Promise<string> {
  const before = await getItem(db, id);
  if (!before) {
    throw new Error(`No existe el producto ${id}`);
  }
  const at = nowTimestamp(now);
  let eventId = '';
  await db.withTransactionAsync(async () => {
    await writePatch(db, id, patch, at);
    eventId = await insertEvent(db, id, event.type, event.quantityDelta ?? 0, at, { item: before });
  });
  return eventId;
}

/** Separa una parte de un producto en un lote nuevo (por ejemplo, para congelar la mitad). */
export async function splitItem(
  db: Db,
  id: string,
  quantity: number,
  newItemPatch: ItemPatch = {},
  now = new Date(),
): Promise<{ eventId: string; newItem: InventoryItem }> {
  const before = await getItem(db, id);
  if (!before || quantity <= 0 || quantity >= before.quantity) {
    throw new Error('Cantidad inválida para dividir');
  }
  const at = nowTimestamp(now);
  const newItem: InventoryItem = {
    ...before,
    ...newItemPatch,
    id: newId(),
    quantity,
    createdAt: at,
    updatedAt: at,
  };
  let eventId = '';
  await db.withTransactionAsync(async () => {
    await writePatch(db, id, { quantity: before.quantity - quantity }, at);
    await insertRow(db, newItem);
    await insertEvent(db, newItem.id, 'added', quantity, at, null);
    eventId = await insertEvent(db, id, 'split', -quantity, at, {
      item: before,
      createdItemId: newItem.id,
    });
  });
  return { eventId, newItem };
}

async function deleteItem(db: Db, id: string): Promise<void> {
  await db.runAsync('DELETE FROM item_events WHERE item_id = ?', [id]);
  await db.runAsync('DELETE FROM inventory_items WHERE id = ?', [id]);
}

/** Deshace un evento: vuelve el producto al estado anterior (o lo borra si recién se agregó). */
export async function undoEvent(db: Db, eventId: string): Promise<void> {
  const row = await db.getFirstAsync<{ item_id: string; type: EventType; snapshot: string | null }>(
    'SELECT item_id, type, snapshot FROM item_events WHERE id = ?',
    [eventId],
  );
  if (!row) {
    return;
  }
  await db.withTransactionAsync(async () => {
    if (row.type === 'added') {
      await deleteItem(db, row.item_id);
      return;
    }
    const snapshot = row.snapshot ? (JSON.parse(row.snapshot) as Snapshot) : null;
    if (snapshot) {
      const { id, createdAt, updatedAt, ...rest } = snapshot.item;
      void createdAt;
      await writePatch(db, id, rest, updatedAt);
      if (snapshot.createdItemId) {
        await deleteItem(db, snapshot.createdItemId);
      }
    }
    await db.runAsync('DELETE FROM item_events WHERE id = ?', [eventId]);
  });
}

/**
 * Cierre del ciclo: lo que venció hace más de `graceDays` días sin respuesta se archiva como
 * "sin información" (no cuenta como botado).
 */
export async function archiveUnanswered(
  db: Db,
  olderThan: IsoDate,
  now = new Date(),
): Promise<number> {
  const stale = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM inventory_items WHERE status = 'active' AND expires_at < ?",
    [olderThan],
  );
  for (const { id } of stale) {
    await updateItem(
      db,
      id,
      { status: 'unknown', closedAt: nowTimestamp(now) },
      { type: 'unknown' },
      now,
    );
  }
  return stale.length;
}

/** Borra productos recién agregados (para deshacer "Agregaste 5 productos"). */
export async function removeItems(db: Db, ids: string[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await deleteItem(db, id);
    }
  });
}
