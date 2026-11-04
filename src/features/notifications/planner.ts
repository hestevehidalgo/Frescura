// Decide qué avisos programar. Sin efectos: lo prueba planner.test.ts.
// Regla: la app no es invasiva. Un solo resumen a la semana (por defecto el domingo), y solo si
// algo vence esa semana. Nunca de noche.

import type { InventoryItem } from '@/db/inventory-repo';
import type { Settings } from '@/db/settings-repo';
import type { Product } from '@/features/catalog/catalog';
import { joinList, t, tn, type MessageKey } from '@/i18n';
import { addDays, atLocalTime, nextWeekday, weekdayOf, type IsoDate } from '@/lib/dates';
import { capitalize } from '@/lib/text';

/** Semanas hacia adelante que se programan (muy por debajo del límite de 64 avisos de iOS). */
export const PLAN_WEEKS = 4;
export const IOS_LIMIT = 64;
const MAX_LISTED = 3;

export type NotificationKind = 'summary';
export const CATEGORY_SINGLE = 'single_item';
export const CATEGORY_SUMMARY = 'summary';

export const WEEKDAY_KEYS: MessageKey[] = [
  'weekdays.sun',
  'weekdays.mon',
  'weekdays.tue',
  'weekdays.wed',
  'weekdays.thu',
  'weekdays.fri',
  'weekdays.sat',
];

export type PlannedNotification = {
  id: string;
  kind: NotificationKind;
  date: Date;
  title: string;
  body: string;
  categoryId: typeof CATEGORY_SINGLE | typeof CATEGORY_SUMMARY;
  /** Solo cuando el aviso es de un único producto: permite "Me lo comí" desde el aviso. */
  itemId: string | null;
};

type PlanInput = {
  items: InventoryItem[];
  lookup: (productId: string) => Product | undefined;
  settings: Settings;
  today: IsoDate;
  now: Date;
};

function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isQuietTime(minutes: number, quietStart: number, quietEnd: number): boolean {
  if (quietStart === quietEnd) {
    return false;
  }
  return quietStart < quietEnd
    ? minutes >= quietStart && minutes < quietEnd
    : minutes >= quietStart || minutes < quietEnd;
}

/**
 * Hora del resumen fuera del horario silencioso: si cae adentro, se mueve al final del silencio.
 * Si el silencio es de noche (por ejemplo de 21:00 a 08:00) y el resumen cae en la parte de la
 * noche, el final del silencio es al día siguiente, nunca antes de la hora elegida.
 */
export function summaryTime(day: IsoDate, settings: Settings): Date {
  const date = atLocalTime(day, settings.summaryHour, settings.summaryMinute);
  const minutes = minutesOf(date);
  if (!isQuietTime(minutes, settings.quietStart, settings.quietEnd)) {
    return date;
  }
  const crossesMidnight = settings.quietStart > settings.quietEnd;
  const endDay = crossesMidnight && minutes >= settings.quietStart ? addDays(day, 1) : day;
  return atLocalTime(endDay, Math.floor(settings.quietEnd / 60), settings.quietEnd % 60);
}

function alerts(item: InventoryItem, lookup: PlanInput['lookup'], settings: Settings): boolean {
  if (item.status !== 'active' || item.location === 'freezer') {
    return false;
  }
  const product = lookup(item.productId);
  if (!product) {
    return true;
  }
  if (settings.mutedCategories.includes(product.categoryId)) {
    return false;
  }
  return settings.longLifeAlerts || !product.longLife;
}

function dayName(date: IsoDate, summaryDay: IsoDate): string {
  return date === summaryDay
    ? t('notifications.whenToday')
    : t(WEEKDAY_KEYS[weekdayOf(date)] ?? 'weekdays.sun');
}

export function planNotifications({
  items,
  lookup,
  settings,
  today,
  now,
}: PlanInput): PlannedNotification[] {
  if (!settings.notificationsEnabled) {
    return [];
  }
  const candidates = items.filter((item) => alerts(item, lookup, settings));
  const plan: PlannedNotification[] = [];
  const firstDay = nextWeekday(today, settings.summaryWeekday);

  for (let week = 0; week <= PLAN_WEEKS; week++) {
    const day = addDays(firstDay, week * 7);
    const date = summaryTime(day, settings);
    if (date <= now) {
      continue;
    }
    // Lo que vence desde el día del resumen hasta el día anterior al próximo resumen.
    const end = addDays(day, 6);
    const due = candidates
      .filter((item) => item.expiresAt >= day && item.expiresAt <= end)
      .sort(
        (a, b) =>
          a.expiresAt.localeCompare(b.expiresAt) ||
          a.displayName.localeCompare(b.displayName, 'es'),
      );
    const first = due[0];
    if (!first) {
      continue;
    }
    const listed = due
      .slice(0, MAX_LISTED)
      .map((item) => `${item.displayName.toLowerCase()} (${dayName(item.expiresAt, day)})`);
    if (due.length > MAX_LISTED) {
      listed.push(t('notifications.more', { n: due.length - MAX_LISTED }));
    }
    plan.push({
      id: `summary-${day}`,
      kind: 'summary',
      date,
      title:
        due.length === 1
          ? t('notifications.weeklyTitleOne', { name: first.displayName })
          : tn('notifications.weeklyTitleMany', due.length),
      body: `${capitalize(joinList(listed))}.`,
      categoryId: due.length === 1 ? CATEGORY_SINGLE : CATEGORY_SUMMARY,
      itemId: due.length === 1 ? first.id : null,
    });
    if (plan.length >= PLAN_WEEKS) {
      break;
    }
  }

  return plan.slice(0, IOS_LIMIT - 4);
}
