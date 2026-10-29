import { genericProduct, getCatalogProduct, type Product } from '@/features/catalog/catalog';
import type { Unit } from '@/lib/quantity';

import { newId, nowTimestamp, type Db } from './db';

// Productos propios del usuario (escritos a mano o leídos de un código de barras) y códigos de
// barras conocidos. Los productos del catálogo no se guardan aquí: se leen de catalog.json.

const CUSTOM_PREFIX = 'u:';

export type CustomProductInput = { name: string; categoryId: string; unit: Unit; emoji?: string };

export async function createCustomProduct(db: Db, input: CustomProductInput): Promise<Product> {
  const id = `${CUSTOM_PREFIX}${newId()}`;
  await db.runAsync(
    'INSERT INTO products (id, name, category_id, unit, emoji, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.name, input.categoryId, input.unit, input.emoji ?? null, nowTimestamp()],
  );
  return withEmoji(genericProduct(id, input.name, input.categoryId, input.unit), input.emoji);
}

function withEmoji(product: Product, emoji: string | null | undefined): Product {
  return emoji ? { ...product, emoji } : product;
}

/** Producto del catálogo o propio. Si no existe (por ejemplo, datos viejos), devuelve null. */
export async function findProduct(db: Db, id: string): Promise<Product | null> {
  const fromCatalog = getCatalogProduct(id);
  if (fromCatalog) {
    return fromCatalog;
  }
  const row = await db.getFirstAsync<{
    name: string;
    category_id: string;
    unit: Unit;
    emoji: string | null;
  }>('SELECT name, category_id, unit, emoji FROM products WHERE id = ?', [id]);
  return row ? withEmoji(genericProduct(id, row.name, row.category_id, row.unit), row.emoji) : null;
}

/** Productos propios cuyo nombre contiene el texto (para el autocompletado). */
export async function searchCustomProducts(db: Db, query: string, limit = 5): Promise<Product[]> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    category_id: string;
    unit: Unit;
    emoji: string | null;
  }>(
    'SELECT id, name, category_id, unit, emoji FROM products WHERE name LIKE ? ORDER BY name LIMIT ?',
    [`%${query.trim()}%`, limit],
  );
  return rows.map((r) => withEmoji(genericProduct(r.id, r.name, r.category_id, r.unit), r.emoji));
}

export type BarcodeEntry = {
  ean: string;
  productId: string;
  name: string;
  brand: string | null;
  source: 'user' | 'openfoodfacts';
};

export async function findBarcode(db: Db, ean: string): Promise<BarcodeEntry | null> {
  const row = await db.getFirstAsync<{
    ean: string;
    product_id: string;
    name: string;
    brand: string | null;
    source: BarcodeEntry['source'];
  }>('SELECT ean, product_id, name, brand, source FROM barcodes WHERE ean = ?', [ean]);
  return row
    ? {
        ean: row.ean,
        productId: row.product_id,
        name: row.name,
        brand: row.brand,
        source: row.source,
      }
    : null;
}

export async function saveBarcode(db: Db, entry: BarcodeEntry): Promise<void> {
  await db.runAsync(
    `INSERT INTO barcodes (ean, product_id, name, brand, source, created_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(ean) DO UPDATE SET product_id = excluded.product_id, name = excluded.name,
       brand = excluded.brand, source = excluded.source`,
    [entry.ean, entry.productId, entry.name, entry.brand, entry.source, nowTimestamp()],
  );
}

// ---------- Ajustes personales de vida útil ----------

export async function getShelfLifeFactor(db: Db, productId: string): Promise<number> {
  const row = await db.getFirstAsync<{ factor: number }>(
    'SELECT factor FROM shelf_life_adjustments WHERE product_id = ?',
    [productId],
  );
  return row?.factor ?? 1;
}

export async function setShelfLifeFactor(db: Db, productId: string, factor: number): Promise<void> {
  await db.runAsync(
    `INSERT INTO shelf_life_adjustments (product_id, factor, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(product_id) DO UPDATE SET factor = excluded.factor, updated_at = excluded.updated_at`,
    [productId, factor, nowTimestamp()],
  );
}

export async function listCustomProducts(db: Db): Promise<Product[]> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    category_id: string;
    unit: Unit;
    emoji: string | null;
  }>('SELECT id, name, category_id, unit, emoji FROM products ORDER BY name');
  return rows.map((r) => withEmoji(genericProduct(r.id, r.name, r.category_id, r.unit), r.emoji));
}
