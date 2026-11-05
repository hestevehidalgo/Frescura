// Lista de compras: vive en el celular, como el resto de los datos.

import { normalizeForSearch } from '@/lib/text';

import { newId, nowTimestamp, type Db } from './db';

export type ShoppingSource = 'manual' | 'recipe';

export type ShoppingItem = {
  id: string;
  name: string;
  productId: string | null;
  quantity: number | null;
  unit: string | null;
  source: ShoppingSource;
  checked: boolean;
  createdAt: string;
  checkedAt: string | null;
};

type Row = {
  id: string;
  name: string;
  product_id: string | null;
  quantity: number | null;
  unit: string | null;
  source: ShoppingSource;
  checked: number;
  created_at: string;
  checked_at: string | null;
};

function toItem(r: Row): ShoppingItem {
  return {
    id: r.id,
    name: r.name,
    productId: r.product_id,
    quantity: r.quantity,
    unit: r.unit,
    source: r.source,
    checked: r.checked === 1,
    createdAt: r.created_at,
    checkedAt: r.checked_at,
  };
}

/** Primero lo pendiente (en el orden en que se agregó), después lo ya comprado. */
export async function listShopping(db: Db): Promise<ShoppingItem[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM shopping_items ORDER BY checked, created_at, name',
  );
  return rows.map(toItem);
}

export type NewShoppingItem = {
  name: string;
  productId?: string | null;
  quantity?: number | null;
  unit?: string | null;
  source?: ShoppingSource;
};

/**
 * Agrega a la lista, sin repetir: si ya hay algo pendiente con el mismo producto (o el mismo
 * nombre), no se duplica. Devuelve true si se agregó.
 */
export async function addShopping(
  db: Db,
  input: NewShoppingItem,
  now = new Date(),
): Promise<boolean> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) {
    return false;
  }
  const pending = await db.getAllAsync<Row>('SELECT * FROM shopping_items WHERE checked = 0');
  const key = normalizeForSearch(name);
  const repeated = pending.some(
    (r) =>
      (input.productId && r.product_id === input.productId) || normalizeForSearch(r.name) === key,
  );
  if (repeated) {
    return false;
  }
  await db.runAsync(
    `INSERT INTO shopping_items (id, name, product_id, quantity, unit, source, checked, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      newId(),
      name.slice(0, 80),
      input.productId ?? null,
      input.quantity ?? null,
      input.unit ?? null,
      input.source ?? 'manual',
      nowTimestamp(now),
    ],
  );
  return true;
}

export async function setShoppingChecked(
  db: Db,
  id: string,
  checked: boolean,
  now = new Date(),
): Promise<void> {
  await db.runAsync('UPDATE shopping_items SET checked = ?, checked_at = ? WHERE id = ?', [
    checked ? 1 : 0,
    checked ? nowTimestamp(now) : null,
    id,
  ]);
}

export async function removeShopping(db: Db, id: string): Promise<void> {
  await db.runAsync('DELETE FROM shopping_items WHERE id = ?', [id]);
}

/** Borra lo ya comprado. Devuelve cuántos se borraron. */
export async function clearCheckedShopping(db: Db): Promise<number> {
  const result = await db.runAsync('DELETE FROM shopping_items WHERE checked = 1');
  return result.changes;
}
