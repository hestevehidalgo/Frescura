import { loadStatsData } from '@/db/stats-repo';
import { createMigratedDb } from '@/db/test-db';
import { makeItem } from '@/db/test-items';
import { getCatalogProduct, type Product } from '@/features/catalog/catalog';
import { addToInventory, performAction } from '@/features/inventory/service';

import {
  buildTips,
  monthlyStats,
  priceComparisons,
  priceHistory,
  shiftMonth,
  tipProductOf,
  weeklyStreak,
  type StatsData,
  type StatsEvent,
  type StatsItem,
} from './stats';

function product(id: string): Product {
  const p = getCatalogProduct(id);
  if (!p) {
    throw new Error(id);
  }
  return p;
}
const categoryOf = (id: string) => getCatalogProduct(id)?.categoryId ?? 'otros';
const at = (date: string) => new Date(`${date}T15:00:00Z`);

function statsItem(productId: string, extra: Partial<StatsItem> = {}): StatsItem {
  return { ...makeItem(productId, '2026-11-20'), store: null, ...extra };
}
function event(itemId: string, type: StatsEvent['type'], delta: number, date: string): StatsEvent {
  return {
    itemId,
    type,
    quantityDelta: delta,
    at: `${date}T15:00:00.000Z`,
    expiresBefore: '2026-11-20',
    splitChild: null,
  };
}

it('shiftMonth cruza el año', () => {
  expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  expect(shiftMonth('2026-11', 0)).toBe('2026-11');
});

describe('monthlyStats con la base real', () => {
  it('cuenta plata botada, salvada y aprovechada, proporcional a la cantidad', async () => {
    const db = await createMigratedDb();
    // Lechuga $1.000, vence pronto y te la comes: salvada.
    const lettuce = await addToInventory(db, {
      product: product('lechuga'),
      quantity: 1,
      priceClp: 1000,
      purchasedAt: '2026-11-02',
    });
    await performAction(db, lettuce.id, { type: 'consume' }, '2026-11-04', at('2026-11-04'));
    // Pan $2.000 por 10: te comes 6 con tiempo y botas 4.
    const bread = await addToInventory(db, {
      product: product('marraqueta'),
      quantity: 10,
      priceClp: 2000,
      purchasedAt: '2026-11-02',
    });
    await performAction(
      db,
      bread.id,
      { type: 'consume', quantity: 6 },
      '2026-11-02',
      at('2026-11-02'),
    );
    // Divide los 4 restantes: el lote nuevo no debe duplicar el gasto.
    await performAction(
      db,
      bread.id,
      { type: 'split', quantity: 2 },
      '2026-11-02',
      at('2026-11-02'),
    );
    await performAction(db, bread.id, { type: 'discard' }, '2026-11-06', at('2026-11-06'));
    // Yogur sin precio: cuenta para el porcentaje, no para la plata.
    const yogurt = await addToInventory(db, {
      product: product('yogur'),
      quantity: 1,
      purchasedAt: '2026-11-02',
    });
    await performAction(db, yogurt.id, { type: 'consume' }, '2026-11-03', at('2026-11-03'));

    // Arroz $1.500 que vence en meses: comido, pero no cuenta como salvado.
    const rice = await addToInventory(db, {
      product: product('arroz'),
      quantity: 1,
      priceClp: 1500,
      purchasedAt: '2026-11-02',
    });
    await performAction(db, rice.id, { type: 'consume' }, '2026-11-03', at('2026-11-03'));

    const data = await loadStatsData(db);
    const stats = monthlyStats(data, '2026-11', categoryOf);
    expect(stats.wastedClp).toBe(400);
    expect(stats.consumedClp).toBe(1000 + 1200 + 1500);
    // La marraqueta dura 1 a 2 días: comerla el mismo día también cuenta como salvada.
    expect(stats.savedClp).toBe(1000 + 1200);
    expect(stats.spentClp).toBe(4500);
    expect(stats.boughtItems).toBe(4);
    expect(stats.pricedItems).toBe(3);
    // Lechuga 1 + pan 0,6 + yogur 1 + arroz 1 comido; pan 0,2 botado.
    expect(stats.usedShare).toBeCloseTo(3.6 / 3.8, 5);
    expect(stats.spendingByCategory.map((s) => s.key)).toEqual([
      categoryOf('marraqueta'),
      categoryOf('arroz'),
      'verduras',
    ]);
    expect(stats.wastedByCategory).toEqual([{ key: categoryOf('marraqueta'), clp: 400 }]);

    expect(monthlyStats(data, '2026-10', categoryOf).usedShare).toBeNull();
  });
});

describe('gasto por supermercado', () => {
  it('agrupa por tienda y deja aparte lo sin tienda', () => {
    const a = statsItem('leche-fresca', {
      priceClp: 1000,
      store: 'Líder',
      purchasedAt: '2026-11-01',
    });
    const b = statsItem('palta', { priceClp: 3000, store: 'Feria', purchasedAt: '2026-11-02' });
    const c = statsItem('palta', { priceClp: 500, store: null, purchasedAt: '2026-11-02' });
    const stats = monthlyStats({ items: [a, b, c], events: [] }, '2026-11', categoryOf);
    expect(stats.spendingByStore).toEqual([
      { key: 'Feria', clp: 3000 },
      { key: 'Líder', clp: 1000 },
      { key: '', clp: 500 },
    ]);
  });
});

describe('weeklyStreak', () => {
  const item = statsItem('palta');
  const base: StatsEvent[] = [event(item.id, 'added', 1, '2026-10-05')];

  it('cuenta semanas completas sin botar comida', () => {
    // Hoy es martes 3 de noviembre; la última vez que botó fue la semana del 12 de octubre.
    const data: StatsData = {
      items: [item],
      events: [...base, event(item.id, 'discarded', -1, '2026-10-14')],
    };
    expect(weeklyStreak(data, '2026-11-03')).toBe(2);
  });

  it('es 0 si botó algo esta semana o si recién empezó', () => {
    const data: StatsData = {
      items: [item],
      events: [...base, event(item.id, 'discarded', -1, '2026-11-02')],
    };
    expect(weeklyStreak(data, '2026-11-03')).toBe(0);
    expect(weeklyStreak({ items: [], events: [] }, '2026-11-03')).toBe(0);
    expect(
      weeklyStreak(
        { items: [item], events: [event(item.id, 'added', 1, '2026-11-02')] },
        '2026-11-03',
      ),
    ).toBe(0);
  });

  it('no cuenta semanas antes de empezar a usar la app', () => {
    expect(weeklyStreak({ items: [item], events: base }, '2026-11-03')).toBe(4);
  });
});

describe('buildTips', () => {
  const productOf = (id: string) => {
    const p = getCatalogProduct(id);
    return p ? tipProductOf(p) : undefined;
  };
  const categoryName = (id: string) => id;

  it('sugiere comprar menos o congelar lo que más se bota', () => {
    const items = [1, 2, 3].map(() => statsItem('lechuga'));
    const bread = [1, 2].map(() => statsItem('marraqueta'));
    const events = [
      event(items[0]!.id, 'discarded', -1, '2026-10-20'),
      event(items[1]!.id, 'discarded', -1, '2026-10-27'),
      event(items[2]!.id, 'consumed', -1, '2026-11-01'),
      event(bread[0]!.id, 'discarded', -1, '2026-10-20'),
      event(bread[1]!.id, 'discarded', -1, '2026-10-28'),
    ];
    const data = { items: [...items, ...bread], events };
    const monthly = monthlyStats(data, '2026-11', categoryOf);
    const tips = buildTips(data, '2026-11-03', monthly, productOf, categoryName);
    expect(tips.map((t) => t.key)).toEqual(['freezePart', 'buyLess']);
    expect(tips[0]?.params).toEqual({ name: 'Marraqueta', pct: 100 });
    expect(tips[1]?.params).toEqual({ name: 'Lechuga', pct: 67 });
  });

  it('felicita un buen mes y pide marcar lo vencido sin respuesta', () => {
    const items = [1, 2, 3, 4, 5].map(() =>
      statsItem('palta', { priceClp: 1000, purchasedAt: '2026-11-01' }),
    );
    const unknown = [1, 2, 3].map(() =>
      statsItem('yogur', { status: 'unknown', closedAt: '2026-11-02T12:00:00.000Z' }),
    );
    const events = items.map((i) => event(i.id, 'consumed', -1, '2026-11-02'));
    const data = { items: [...items, ...unknown], events };
    const monthly = monthlyStats(data, '2026-11', categoryOf);
    const tips = buildTips(data, '2026-11-03', monthly, productOf, categoryName);
    expect(tips).toEqual([
      { key: 'markItems', params: { n: 3 } },
      { key: 'goodMonth', params: { pct: 100 } },
    ]);
  });
});

describe('precios', () => {
  it('compara el último precio por kilo en cada supermercado', () => {
    const items = [
      statsItem('leche-fresca', {
        unit: 'l',
        quantity: 1,
        priceClp: 1090,
        store: 'Líder',
        purchasedAt: '2026-10-01',
      }),
      statsItem('leche-fresca', {
        unit: 'l',
        quantity: 1,
        priceClp: 1190,
        store: 'Jumbo',
        purchasedAt: '2026-10-10',
      }),
      statsItem('leche-fresca', {
        unit: 'l',
        quantity: 2,
        priceClp: 2000,
        store: 'lider',
        purchasedAt: '2026-10-20',
      }),
      statsItem('queso-gauda', {
        unit: 'g',
        quantity: 250,
        priceClp: 2500,
        store: 'Líder',
        purchasedAt: '2026-10-20',
      }),
      statsItem('palta', { priceClp: 990, store: null }),
    ];
    const history = priceHistory({ items, events: [] });
    expect(history.get('queso-gauda')?.[0]).toMatchObject({ perUnitClp: 10000, unit: 'kg' });
    expect(history.get('leche-fresca')?.map((p) => p.perUnitClp)).toEqual([1000, 1190, 1090]);
    expect(priceComparisons(history)).toEqual([
      {
        productId: 'leche-fresca',
        unit: 'l',
        stores: [
          { store: 'lider', perUnitClp: 1000, date: '2026-10-20' },
          { store: 'Jumbo', perUnitClp: 1190, date: '2026-10-10' },
        ],
        savingPct: 16,
      },
    ]);
  });
});
