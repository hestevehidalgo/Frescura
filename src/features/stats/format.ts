// Textos de fechas y precios para el resumen.
import { t, type MessageKey } from '@/i18n';
import { formatClp } from '@/lib/money';

import type { Month, PriceUnit } from './stats';

/** "2026-11" → "noviembre 2026" */
export function monthLabel(month: Month): string {
  const [year, mm] = month.split('-');
  return `${t(`months.${mm ?? '01'}` as MessageKey)} ${year ?? ''}`;
}

/** "noviembre" */
export function monthName(month: Month): string {
  return t(`months.${month.split('-')[1] ?? '01'}` as MessageKey);
}

/** "$1.090/kg", "$990 c/u" */
export function perUnitLabel(amount: number, unit: PriceUnit): string {
  return t(`summary.perUnit.${unit}`, { amount: formatClp(amount) });
}
