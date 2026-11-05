// Texto para compartir el resumen del mes (y para la tarjeta-imagen).

import { t, tn } from '@/i18n';
import { formatClp } from '@/lib/money';

import type { MonthlyStats } from './stats';

export type ShareContent = { headline: string; lines: string[]; message: string };

/** ¿Hay algo que valga la pena compartir? (plata salvada o algo cerrado en el mes) */
export function canShare(stats: MonthlyStats): boolean {
  // Un porcentaje con uno o dos productos no dice nada: se pide un mínimo.
  const closed = stats.consumedCount + stats.discardedCount;
  return stats.savedClp > 0 || (stats.usedShare !== null && closed >= MIN_CLOSED_TO_SHARE);
}

export const MIN_CLOSED_TO_SHARE = 5;

export function shareContent(stats: MonthlyStats, monthName: string, streak: number): ShareContent {
  const headline =
    stats.savedClp > 0
      ? t('share.saved', { amount: formatClp(stats.savedClp), month: monthName })
      : t('share.used', { pct: Math.round((stats.usedShare ?? 0) * 100), month: monthName });
  const lines: string[] = [];
  if (stats.savedClp > 0 && stats.usedShare !== null) {
    lines.push(t('share.usedLine', { pct: Math.round(stats.usedShare * 100) }));
  }
  if (streak > 0) {
    lines.push(tn('share.streak', streak));
  }
  const message = [headline, ...lines, t('share.footer')].join('\n');
  return { headline, lines, message };
}
