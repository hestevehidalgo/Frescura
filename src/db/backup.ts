// Respaldo: todos los datos del celular en un archivo JSON, para no perderlos al cambiar de
// teléfono. No sale a ningún servidor: la persona decide dónde guardarlo (Archivos, correo…).

import type { BindValue, Db } from './db';
import { SCHEMA_VERSION } from './migrations';

// En orden de dependencias: primero lo que otras tablas referencian.
const TABLES = [
  'products',
  'barcodes',
  'receipts',
  'inventory_items',
  'item_events',
  'shelf_life_adjustments',
  'settings',
  'user_recipes',
] as const;

type Table = (typeof TABLES)[number];
type Row = Record<string, BindValue>;

export type Backup = {
  app: 'frescura';
  schemaVersion: number;
  exportedAt: string;
  tables: Record<Table, Row[]>;
};

export async function exportBackup(db: Db, now = new Date()): Promise<Backup> {
  const tables = {} as Record<Table, Row[]>;
  for (const table of TABLES) {
    tables[table] = await db.getAllAsync<Row>(`SELECT * FROM ${table}`);
  }
  return { app: 'frescura', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), tables };
}

export type ParseBackupError = 'invalid' | 'newer';

function isBindValue(value: unknown): value is BindValue {
  return value === null || typeof value === 'string' || typeof value === 'number';
}

/** Revisa que el archivo sea un respaldo de Frescura que esta versión pueda leer. */
export function parseBackup(text: string): Backup | { error: ParseBackupError } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: 'invalid' };
  }
  if (typeof raw !== 'object' || raw === null) {
    return { error: 'invalid' };
  }
  const b = raw as Record<string, unknown>;
  if (b.app !== 'frescura' || typeof b.schemaVersion !== 'number' || typeof b.tables !== 'object') {
    return { error: 'invalid' };
  }
  if (b.schemaVersion > SCHEMA_VERSION) {
    return { error: 'newer' };
  }
  const source = (b.tables ?? {}) as Record<string, unknown>;
  const tables = {} as Record<Table, Row[]>;
  for (const table of TABLES) {
    const rows = source[table] ?? [];
    if (!Array.isArray(rows)) {
      return { error: 'invalid' };
    }
    const clean: Row[] = [];
    for (const row of rows) {
      if (typeof row !== 'object' || row === null) {
        return { error: 'invalid' };
      }
      const entries = Object.entries(row as Record<string, unknown>);
      if (!entries.every(([, value]) => isBindValue(value))) {
        return { error: 'invalid' };
      }
      clean.push(Object.fromEntries(entries) as Row);
    }
    tables[table] = clean;
  }
  return {
    app: 'frescura',
    schemaVersion: b.schemaVersion,
    exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : '',
    tables,
  };
}

/**
 * Reemplaza todos los datos por los del respaldo. Se hace en una transacción: si algo falla,
 * no se pierde nada. Las columnas que no existen se ignoran y las nuevas quedan vacías, así un
 * respaldo de una versión anterior también sirve.
 */
export async function restoreBackup(db: Db, backup: Backup): Promise<{ items: number }> {
  await db.withTransactionAsync(async () => {
    for (const table of [...TABLES].reverse()) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    for (const table of TABLES) {
      const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      const known = new Set(info.map((c) => c.name));
      for (const row of backup.tables[table]) {
        const columns = Object.keys(row).filter((c) => known.has(c));
        if (columns.length === 0) {
          continue;
        }
        await db.runAsync(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map((c) => row[c] ?? null),
        );
      }
    }
  });
  return { items: backup.tables.inventory_items.length };
}

/** Borra todos los datos del celular (para "Borrar todos mis datos"). */
export async function wipeAllData(db: Db): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const table of [...TABLES].reverse()) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
  });
}

/** Nombre del archivo: "frescura-respaldo-2026-11-03.json". */
export function backupFileName(date: string): string {
  return `frescura-respaldo-${date}.json`;
}
