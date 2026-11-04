// Fecha de compra escrita a mano. Usa el mismo lector que las fechas de envase, pero una compra
// nunca es futura: "12/11" sin año es de este año (o del año pasado si todavía no llega).

import { makeDate, type IsoDate } from './dates';
import { parsePackageDate } from './package-date';

export type PurchaseDateResult = { date: IsoDate } | { error: 'invalid' | 'future' };

export function parsePurchaseDate(text: string, today: IsoDate): PurchaseDateResult {
  const parsed = parsePackageDate(text, today)?.date;
  if (!parsed) {
    return { error: 'invalid' };
  }
  if (parsed <= today) {
    return { date: parsed };
  }
  // Sin año escrito, el lector pudo elegir el año siguiente: se prueba con el anterior.
  const hasYear = /\d{1,2}\s?[/.-]\s?\d{1,2}\s?[/.-]\s?\d{2,4}|20\d{2}/.test(text);
  if (!hasYear) {
    const [y, m, d] = parsed.split('-').map(Number);
    const previous = makeDate((y ?? 0) - 1, m ?? 1, d ?? 1);
    if (previous && previous <= today) {
      return { date: previous };
    }
  }
  return { error: 'future' };
}
