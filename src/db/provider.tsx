import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import type { ReactNode } from 'react';

import type { Db } from './db';
import { migrate } from './migrations';

const DATABASE_NAME = 'frescura.db';

const adapters = new WeakMap<SQLiteDatabase, Db>();

/** Adapta la base de expo-sqlite a la interfaz Db (la misma que usan los tests). */
function adapt(sqlite: SQLiteDatabase): Db {
  let db = adapters.get(sqlite);
  if (!db) {
    db = {
      execAsync: (sql) => sqlite.execAsync(sql),
      runAsync: (sql, params = []) => sqlite.runAsync(sql, params),
      getAllAsync: (sql, params = []) => sqlite.getAllAsync(sql, params),
      getFirstAsync: (sql, params = []) => sqlite.getFirstAsync(sql, params),
      withTransactionAsync: (task) => sqlite.withTransactionAsync(task),
    };
    adapters.set(sqlite, db);
  }
  return db;
}

/** Abre la base local y corre las migraciones antes de mostrar la app. */
export function DbProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={(sqlite) => migrate(adapt(sqlite))}>
      {children}
    </SQLiteProvider>
  );
}

export function useDb(): Db {
  return adapt(useSQLiteContext());
}
