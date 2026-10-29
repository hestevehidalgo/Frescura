import type { Db } from './db';

// Migraciones versionadas. Nunca se edita una migración ya publicada: se agrega una nueva al final.
// La versión actual se guarda en PRAGMA user_version.

const MIGRATIONS: string[] = [
  // 1: inventario local
  `
  CREATE TABLE products (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    category_id TEXT NOT NULL,
    unit TEXT NOT NULL,
    emoji TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE barcodes (
    ean TEXT PRIMARY KEY NOT NULL,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE receipts (
    id TEXT PRIMARY KEY NOT NULL,
    chain TEXT,
    issuer_rut TEXT,
    folio TEXT,
    purchased_at TEXT NOT NULL,
    total_clp INTEGER,
    fingerprint TEXT UNIQUE,
    scanned_at TEXT NOT NULL,
    local_image_uri TEXT
  );

  CREATE TABLE inventory_items (
    id TEXT PRIMARY KEY NOT NULL,
    product_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    location TEXT NOT NULL,
    price_clp INTEGER,
    purchased_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    latest_at TEXT,
    expiry_source TEXT NOT NULL,
    date_type TEXT NOT NULL,
    opened_at TEXT,
    frozen_at TEXT,
    thawed_at TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    discard_reason TEXT,
    receipt_id TEXT REFERENCES receipts(id),
    notes TEXT,
    closed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX inventory_items_status ON inventory_items (status, expires_at);
  CREATE INDEX inventory_items_product ON inventory_items (product_id);

  CREATE TABLE item_events (
    id TEXT PRIMARY KEY NOT NULL,
    item_id TEXT NOT NULL REFERENCES inventory_items(id),
    type TEXT NOT NULL,
    quantity_delta REAL NOT NULL DEFAULT 0,
    at TEXT NOT NULL,
    snapshot TEXT
  );
  CREATE INDEX item_events_item ON item_events (item_id, at);

  CREATE TABLE shelf_life_adjustments (
    product_id TEXT PRIMARY KEY NOT NULL,
    factor REAL NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function migrate(db: Db): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version] ?? '';
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}
