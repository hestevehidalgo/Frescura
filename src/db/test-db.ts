// Solo para tests: implementa la interfaz Db con el SQLite que trae Node.
import { DatabaseSync } from 'node:sqlite';

import type { BindValue, Db } from './db';
import { migrate } from './migrations';

export function createMemoryDb(): Db {
  const sqlite = new DatabaseSync(':memory:');
  return {
    async execAsync(sql) {
      sqlite.exec(sql);
    },
    async runAsync(sql, params: BindValue[] = []) {
      const result = sqlite.prepare(sql).run(...params);
      return { changes: Number(result.changes) };
    },
    async getAllAsync<T>(sql: string, params: BindValue[] = []) {
      return sqlite.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, params: BindValue[] = []) {
      return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async withTransactionAsync(task) {
      sqlite.exec('BEGIN');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

export async function createMigratedDb(): Promise<Db> {
  const db = createMemoryDb();
  await migrate(db);
  return db;
}
