import type { Db } from './db';

export type Settings = {
  notificationsEnabled: boolean;
  /** Hora del resumen diario (por defecto 18:30, antes de cocinar). */
  summaryHour: number;
  summaryMinute: number;
  /** Con cuántos días de anticipación avisar (1, 2 o 3). */
  daysAhead: 1 | 2 | 3;
  /** Aviso extra en la mañana para carnes, pescados y mariscos que vencen ese día. */
  morningAlert: boolean;
  morningHour: number;
  /** Horario silencioso, en minutos desde la medianoche. */
  quietStart: number;
  quietEnd: number;
  /** Categorías que no avisan. */
  mutedCategories: string[];
  /** Si los productos de larga duración (arroz, fideos, conservas) también avisan. */
  longLifeAlerts: boolean;
  /** Básicos que "siempre tengo", para las recetas. */
  pantryBasics: string[];
  notificationPromptAnswered: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: true,
  summaryHour: 18,
  summaryMinute: 30,
  daysAhead: 2,
  morningAlert: true,
  morningHour: 9,
  quietStart: 22 * 60,
  quietEnd: 8 * 60,
  mutedCategories: [],
  longLifeAlerts: false,
  pantryBasics: ['sal', 'aceite', 'azucar', 'harina', 'ajo'],
  notificationPromptAnswered: false,
};

export async function getSettings(db: Db): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings',
  );
  const stored: Partial<Record<keyof Settings, unknown>> = {};
  for (const { key, value } of rows) {
    if (key in DEFAULT_SETTINGS) {
      try {
        stored[key as keyof Settings] = JSON.parse(value);
      } catch {
        // Un valor dañado no debe botar la app: se usa el valor por defecto.
      }
    }
  }
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
}

export async function saveSettings(db: Db, patch: Partial<Settings>): Promise<Settings> {
  await db.withTransactionAsync(async () => {
    for (const [key, value] of Object.entries(patch)) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, JSON.stringify(value)],
      );
    }
  });
  return getSettings(db);
}
