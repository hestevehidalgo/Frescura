// Interfaz mínima de base de datos. En la app la implementa expo-sqlite; en los tests, el
// SQLite que trae Node (ver test-db.ts). Así el SQL real se prueba sin el celular.

export type BindValue = string | number | null;

export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: BindValue[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: BindValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: BindValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/** Identificador único (UUID v4). */
export function newId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Momento actual con hora, para eventos y auditoría. */
export function nowTimestamp(now: Date = new Date()): string {
  return now.toISOString();
}
