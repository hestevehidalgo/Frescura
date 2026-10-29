import type { InventoryItem } from '@/db/inventory-repo';
import { DEFAULT_SETTINGS, type Settings } from '@/db/settings-repo';
import { getCatalogProduct } from '@/features/catalog/catalog';

import { IOS_LIMIT, isQuietTime, planNotifications } from './planner';

let n = 0;
function item(
  productId: string,
  expiresAt: string,
  extra: Partial<InventoryItem> = {},
): InventoryItem {
  n += 1;
  const product = getCatalogProduct(productId);
  return {
    id: `item-${n}`,
    productId,
    displayName: product?.name ?? productId,
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
const NOW = new Date('2026-11-10T12:00:00-03:00'); // mediodía en Chile

function plan(items: InventoryItem[], settings: Partial<Settings> = {}, today = TODAY, now = NOW) {
  return planNotifications({
    items,
    lookup: getCatalogProduct,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    today,
    now,
  });
}

describe('resumen diario', () => {
  it('no manda nada si no hay nada por vencer', () => {
    expect(plan([])).toEqual([]);
    expect(plan([item('arroz', '2027-06-01', { location: 'pantry' })])).toEqual([]);
  });

  it('un solo resumen al día con lo que vence pronto', () => {
    const summaries = plan([
      item('pollo-trozos', '2026-11-11'),
      item('yogur', '2026-11-12'),
      item('espinaca', '2026-11-12'),
    ]).filter((p) => p.kind === 'summary');
    const first = summaries[0];
    expect(first?.date.toISOString()).toBe('2026-11-10T21:30:00.000Z'); // 18:30 en Chile
    expect(first?.title).toBe('3 cosas vencen pronto');
    expect(first?.body).toBe(
      'Pollo en trozos (mañana), espinaca (en 2 días) y yogur (en 2 días). Ver recetas →',
    );
    expect(first?.itemId).toBeNull();
    // Un aviso por día como máximo.
    expect(new Set(summaries.map((s) => s.id)).size).toBe(summaries.length);
  });

  it('con un solo producto permite responder desde el aviso', () => {
    const [first] = plan([item('yogur', '2026-11-11')]);
    expect(first?.title).toBe('Yogur vence mañana');
    expect(first?.categoryId).toBe('single_item');
    expect(first?.itemId).toBeDefined();
  });

  it('respeta los días de anticipación', () => {
    const items = [item('yogur', '2026-11-13')];
    expect(plan(items, { daysAhead: 2 })[0]?.id).toBe('summary-2026-11-11');
    expect(plan(items, { daysAhead: 3 })[0]?.id).toBe('summary-2026-11-10');
  });

  it('si ya pasó la hora de hoy, parte mañana', () => {
    const late = new Date('2026-11-10T20:00:00-03:00');
    const result = plan([item('yogur', '2026-11-11')], {}, TODAY, late);
    expect(result[0]?.id).toBe('summary-2026-11-11');
    expect(result[0]?.title).toBe('Yogur vence hoy');
  });

  it('no avisa lo congelado, lo silenciado ni la larga duración', () => {
    expect(plan([item('carne-molida', '2026-11-11', { location: 'freezer' })])).toEqual([]);
    expect(plan([item('yogur', '2026-11-11')], { mutedCategories: ['lacteos'] })).toEqual([]);
    expect(plan([item('arroz', '2026-11-11', { location: 'pantry' })])).toEqual([]);
    expect(
      plan([item('arroz', '2026-11-11', { location: 'pantry' })], { longLifeAlerts: true }),
    ).toHaveLength(2);
  });

  it('el interruptor general apaga todo', () => {
    expect(plan([item('yogur', '2026-11-11')], { notificationsEnabled: false })).toEqual([]);
  });

  it('lista hasta tres y resume el resto', () => {
    const items = ['yogur', 'lechuga', 'espinaca', 'frutilla', 'crema'].map((id) =>
      item(id, '2026-11-11'),
    );
    expect(plan(items)[0]?.body).toContain('y 2 más');
  });
});

describe('horario silencioso', () => {
  it('detecta la noche, cruzando la medianoche', () => {
    expect(isQuietTime(23 * 60, 22 * 60, 8 * 60)).toBe(true);
    expect(isQuietTime(3 * 60, 22 * 60, 8 * 60)).toBe(true);
    expect(isQuietTime(18 * 60, 22 * 60, 8 * 60)).toBe(false);
  });

  it('nunca programa de noche', () => {
    const [first] = plan([item('yogur', '2026-11-11')], { summaryHour: 23, summaryMinute: 0 });
    expect(first?.date.getHours()).toBe(21);
    expect(first?.date.getMinutes()).toBe(45);
  });
});

describe('aviso de la mañana', () => {
  it('solo para carnes, pollo y pescados que vencen ese día', () => {
    const result = plan([item('pollo-trozos', '2026-11-11'), item('yogur', '2026-11-11')]);
    const morning = result.filter((p) => p.kind === 'morning');
    expect(morning.map((p) => p.id)).toEqual(['morning-2026-11-11']);
    expect(morning[0]?.title).toBe('Hoy vence pollo en trozos');
    expect(morning[0]?.date.toISOString()).toBe('2026-11-11T12:00:00.000Z'); // 9:00 en Chile
  });

  it('se puede apagar', () => {
    const result = plan([item('pollo-trozos', '2026-11-11')], { morningAlert: false });
    expect(result.every((p) => p.kind === 'summary')).toBe(true);
  });
});

describe('cambio de horario y límite de iOS', () => {
  it('sigue saliendo a las 18:30 cuando Chile adelanta la hora', () => {
    // El 6 de septiembre de 2026 Chile pasa de UTC-4 a UTC-3.
    const items = ['2026-09-05', '2026-09-06', '2026-09-07'].map((d) => item('yogur', d));
    const result = plan(
      items,
      { daysAhead: 1, morningAlert: false },
      '2026-09-04',
      new Date('2026-09-04T12:00:00-04:00'),
    );
    expect(result.map((p) => [p.id, p.date.getHours(), p.date.getMinutes()])).toEqual([
      ['summary-2026-09-04', 18, 30],
      ['summary-2026-09-05', 18, 30],
      ['summary-2026-09-06', 18, 30],
      ['summary-2026-09-07', 18, 30],
    ]);
    expect(result[1]?.date.toISOString()).toBe('2026-09-05T22:30:00.000Z');
    expect(result[2]?.date.toISOString()).toBe('2026-09-06T21:30:00.000Z');
  });

  it('nunca supera el límite de 64 avisos programados', () => {
    const items = Array.from({ length: 40 }, (_, i) =>
      item('pollo-trozos', `2026-11-${String(10 + (i % 14)).padStart(2, '0')}`),
    );
    const result = plan(items, { daysAhead: 3 });
    expect(result.length).toBeLessThanOrEqual(IOS_LIMIT);
    expect(result.length).toBeLessThanOrEqual(28);
  });
});
