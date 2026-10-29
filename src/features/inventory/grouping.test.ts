import type { InventoryItem } from '@/db/inventory-repo';

import { buildHome } from './grouping';

let n = 0;
function item(name: string, expiresAt: string, extra: Partial<InventoryItem> = {}): InventoryItem {
  n += 1;
  return {
    id: `id-${n}`,
    productId: name.toLowerCase(),
    displayName: name,
    quantity: 1,
    unit: 'un',
    location: 'fridge',
    priceClp: null,
    purchasedAt: '2026-11-01',
    expiresAt,
    latestAt: null,
    expirySource: 'estimated',
    dateType: 'best_before',
    openedAt: null,
    frozenAt: null,
    thawedAt: null,
    status: 'active',
    discardReason: null,
    receiptId: null,
    notes: null,
    closedAt: null,
    createdAt: '',
    updatedAt: '',
    ...extra,
  };
}

const TODAY = '2026-11-10';
const ALL = { location: 'all' as const, query: '' };

describe('buildHome', () => {
  const items = [
    item('Arroz', '2027-06-01', { location: 'pantry' }),
    item('Yogur', '2026-11-09'),
    item('Pollo', '2026-11-10'),
    item('Lechuga', '2026-11-12'),
    item('Zanahoria', '2026-11-16'),
    item('Carne', '2026-11-11', { location: 'freezer' }),
  ];

  it('agrupa por urgencia en orden', () => {
    const home = buildHome(items, TODAY, ALL);
    expect(home.sections.map((s) => [s.urgency, s.data.map((r) => r.item.displayName)])).toEqual([
      ['expired', ['Yogur']],
      ['today', ['Pollo']],
      ['soon', ['Carne', 'Lechuga']],
      ['week', ['Zanahoria']],
      ['later', ['Arroz']],
    ]);
  });

  it('separa lo vencido y lo que hay que cocinar hoy', () => {
    const home = buildHome(items, TODAY, ALL);
    expect(home.expired.map((i) => i.displayName)).toEqual(['Yogur']);
    // Lo congelado no cuenta para "Hoy cocina con esto".
    expect(home.cookToday.map((i) => i.displayName)).toEqual(['Pollo', 'Lechuga', 'Zanahoria']);
  });

  it('filtra por lugar', () => {
    const home = buildHome(items, TODAY, { location: 'pantry', query: '' });
    expect(home.sections.flatMap((s) => s.data.map((r) => r.item.displayName))).toEqual(['Arroz']);
    expect(home.total).toBe(6);
  });

  it('busca sin tildes', () => {
    const withAccent = [...items, item('Plátano', '2026-11-13')];
    const home = buildHome(withAccent, TODAY, { location: 'all', query: 'platano' });
    expect(home.sections.flatMap((s) => s.data.map((r) => r.item.displayName))).toEqual([
      'Plátano',
    ]);
  });

  it('marca el lote que conviene usar primero', () => {
    const lots = [
      item('Leche', '2026-11-20', { productId: 'leche' }),
      item('Leche', '2026-11-14', { productId: 'leche' }),
    ];
    const rows = buildHome(lots, TODAY, ALL).sections.flatMap((s) => s.data);
    expect(rows.map((r) => [r.item.expiresAt, r.lotCount, r.useFirst])).toEqual([
      ['2026-11-14', 2, true],
      ['2026-11-20', 2, false],
    ]);
  });
});
