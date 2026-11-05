import { canShare, shareContent } from './share';
import type { MonthlyStats } from './stats';

const base: MonthlyStats = {
  month: '2026-11',
  wastedClp: 700,
  savedClp: 5480,
  consumedClp: 9000,
  usedShare: 0.67,
  consumedCount: 2,
  discardedCount: 1,
  spentClp: 23420,
  boughtItems: 10,
  pricedItems: 10,
  spendingByCategory: [],
  spendingByStore: [],
  wastedByCategory: [],
};

it('arma el mensaje con lo salvado, lo aprovechado y la racha', () => {
  expect(shareContent(base, 'noviembre', 2).message).toBe(
    'En noviembre salvé $5.480 en comida.\nAprovecho el 67 % de lo que compro.\nLlevo 2 semanas seguidas sin botar comida.\nCon Frescura, la app para no botar comida.',
  );
});

it('sin plata salvada, comparte el porcentaje aprovechado', () => {
  const content = shareContent({ ...base, savedClp: 0 }, 'noviembre', 0);
  expect(content.headline).toBe('En noviembre aproveché el 67 % de mi comida.');
  expect(content.lines).toEqual([]);
});

it('canShare', () => {
  expect(canShare(base)).toBe(true);
  expect(canShare({ ...base, savedClp: 0, usedShare: null })).toBe(false);
  // Sin plata salvada y con pocos productos cerrados, no se ofrece compartir.
  expect(canShare({ ...base, savedClp: 0, consumedCount: 1, discardedCount: 0 })).toBe(false);
  expect(canShare({ ...base, savedClp: 0, consumedCount: 4, discardedCount: 1 })).toBe(true);
});
