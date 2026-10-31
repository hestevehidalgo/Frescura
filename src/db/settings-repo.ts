import type { Db } from './db';

export type Settings = {
  /** Resumen semanal: un solo aviso a la semana, y solo si algo vence esa semana. */
  notificationsEnabled: boolean;
  /** Día del resumen: 0 = domingo, 1 = lunes, … 6 = sábado. */
  summaryWeekday: number;
  /** Hora del resumen (por defecto domingo a las 10:00). */
  summaryHour: number;
  summaryMinute: number;
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
  /** Aceptó que la foto de la boleta se envíe a la IA para leerla. */
  receiptPhotoConsent: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: true,
  summaryWeekday: 0,
  summaryHour: 10,
  summaryMinute: 0,
  quietStart: 22 * 60,
  quietEnd: 8 * 60,
  mutedCategories: [],
  longLifeAlerts: false,
  pantryBasics: ['sal', 'aceite', 'azucar', 'harina', 'ajo'],
  notificationPromptAnswered: false,
  receiptPhotoConsent: false,
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
