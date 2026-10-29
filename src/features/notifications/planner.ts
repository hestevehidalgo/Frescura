// Decide qué avisos programar en los próximos días. Sin efectos: lo prueba planner.test.ts.
// Regla: un solo resumen al día, y solo si hay algo por vencer. Nunca de noche.

import type { InventoryItem } from '@/db/inventory-repo';
import type { Settings } from '@/db/settings-repo';
import type { Product } from '@/features/catalog/catalog';
import { joinList, t, tn } from '@/i18n';
import { addDays, atLocalTime, daysBetween, type IsoDate } from '@/lib/dates';
import { capitalize } from '@/lib/text';

/** Días hacia adelante que se programan. iOS permite máximo 64 avisos por app. */
export const PLAN_DAYS = 14;
export const IOS_LIMIT = 64;
const MAX_LISTED = 3;

export type NotificationKind = 'summary' | 'morning';
export const CATEGORY_SINGLE = 'single_item';
export const CATEGORY_SUMMARY = 'summary';

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

/** Hora del resumen fuera del horario silencioso: si cae adentro, se adelanta a antes de dormir. */
function summaryTime(day: IsoDate, settings: Settings): Date {
  const date = atLocalTime(day, settings.summaryHour, settings.summaryMinute);
  if (!isQuietTime(minutesOf(date), settings.quietStart, settings.quietEnd)) {
    return date;
  }
  const fallback = Math.max(0, settings.quietStart - 15);
  return atLocalTime(day, Math.floor(fallback / 60), fallback % 60);
}

function morningTime(day: IsoDate, settings: Settings): Date {
  const minutes = Math.max(settings.morningHour * 60, settings.quietEnd);
  return atLocalTime(day, Math.floor(minutes / 60), minutes % 60);
}

function whenLabel(days: number): string {
  if (days <= 0) {
    return t('notifications.whenToday');
  }
  if (days === 1) {
    return t('notifications.whenTomorrow');
  }
  return t('notifications.whenInDays', { n: days });
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

/** Carnes, pollo, pescados y mariscos frescos: los del aviso de la mañana. */
function isFreshProtein(product: Product | undefined): boolean {
  return !!product && ['carnes', 'aves', 'pescados'].includes(product.categoryId);
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

  for (let offset = 0; offset < PLAN_DAYS; offset++) {
    const day = addDays(today, offset);

    // Aviso de la mañana: proteínas frescas que vencen ese mismo día.
    if (settings.morningAlert) {
      const due = candidates.filter(
        (item) => item.expiresAt === day && isFreshProtein(lookup(item.productId)),
      );
      const date = morningTime(day, settings);
      const first = due[0];
      if (first && date > now) {
        plan.push({
          id: `morning-${day}`,
          kind: 'morning',
          date,
          title: t('notifications.morningTitle', {
            name: joinList(due.slice(0, MAX_LISTED).map((i) => i.displayName.toLowerCase())),
          }),
          body: t('notifications.morningBody'),
          categoryId: due.length === 1 ? CATEGORY_SINGLE : CATEGORY_SUMMARY,
          itemId: due.length === 1 ? first.id : null,
        });
      }
    }

    // Resumen diario: lo que vence entre hoy y los próximos días elegidos.
    const date = summaryTime(day, settings);
    if (date <= now) {
      continue;
    }
    const soon = candidates
      .map((item) => ({ item, days: daysBetween(day, item.expiresAt) }))
      .filter(({ days }) => days >= 0 && days <= settings.daysAhead)
      .sort(
        (a, b) => a.days - b.days || a.item.displayName.localeCompare(b.item.displayName, 'es'),
      );
    const first = soon[0];
    if (!first) {
      continue;
    }
    const listed = soon
      .slice(0, MAX_LISTED)
      .map(({ item, days }) => `${item.displayName.toLowerCase()} (${whenLabel(days)})`);
    if (soon.length > MAX_LISTED) {
      listed.push(t('notifications.more', { n: soon.length - MAX_LISTED }));
    }
    plan.push({
      id: `summary-${day}`,
      kind: 'summary',
      date,
      title:
        soon.length === 1
          ? t('notifications.summaryTitleOne', {
              name: first.item.displayName,
              when: whenLabel(first.days),
            })
          : tn('notifications.summaryTitleMany', soon.length),
      body: t('notifications.summaryBody', { list: capitalize(joinList(listed)) }),
      categoryId: soon.length === 1 ? CATEGORY_SINGLE : CATEGORY_SUMMARY,
      itemId: soon.length === 1 ? first.item.id : null,
    });
  }

  return plan.slice(0, IOS_LIMIT - 4);
}
