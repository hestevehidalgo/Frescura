import { parsePurchaseDate } from './purchase-date';

const TODAY = '2026-11-04';

it('acepta fechas de hoy o pasadas', () => {
  expect(parsePurchaseDate('03/11/2026', TODAY)).toEqual({ date: '2026-11-03' });
  expect(parsePurchaseDate('04/11/26', TODAY)).toEqual({ date: '2026-11-04' });
});

it('una compra no puede ser futura', () => {
  expect(parsePurchaseDate('10/11/2026', TODAY)).toEqual({ error: 'future' });
});

it('sin año usa el año pasado si la fecha aún no llega', () => {
  // 12/12 sin año: el 12 de diciembre de 2026 todavía no llega → 2025.
  expect(parsePurchaseDate('12/12', TODAY)).toEqual({ date: '2025-12-12' });
  // 30/08 sin año, hace más de dos meses: el lector elegiría 2027; debe quedar 2026.
  expect(parsePurchaseDate('30/08', TODAY)).toEqual({ date: '2026-08-30' });
});

it('texto que no es fecha', () => {
  expect(parsePurchaseDate('ayer', TODAY)).toEqual({ error: 'invalid' });
});
