import type { InventoryItem } from '@/db/inventory-repo';
import { DEFAULT_SETTINGS, type Settings } from '@/db/settings-repo';
import { getCatalogProduct } from '@/features/catalog/catalog';

import { IOS_LIMIT, PLAN_WEEKS, isQuietTime, planNotifications, summaryTime } from './planner';

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
    purchasedAt: '2026-10-25',
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

// Jueves 29 de octubre de 2026 al mediodía en Chile. El próximo domingo es el 1 de noviembre.
const TODAY = '2026-10-29';
const NOW = new Date('2026-10-29T12:00:00-03:00');

function plan(items: InventoryItem[], settings: Partial<Settings> = {}, today = TODAY, now = NOW) {
  return planNotifications({
    items,
    lookup: getCatalogProduct,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    today,
    now,
  });
}

describe('resumen semanal', () => {
  it('no manda nada si no hay nada por vencer', () => {
    expect(plan([])).toEqual([]);
    expect(plan([item('arroz', '2027-06-01', { location: 'pantry' })])).toEqual([]);
  });

  it('un aviso el domingo a las 10:00 con lo que vence esa semana', () => {
    const result = plan([
      item('pollo-trozos', '2026-11-02'),
      item('yogur', '2026-11-04'),
      item('espinaca', '2026-11-01'),
      item('lechuga', '2026-11-08'), // ya es la semana siguiente
    ]);
    const first = result[0];
    expect(first?.id).toBe('summary-2026-11-01');
    expect(first?.date.toISOString()).toBe('2026-11-01T13:00:00.000Z'); // 10:00 en Chile (verano)
    expect(first?.title).toBe('3 productos vencen esta semana');
    expect(first?.body).toBe('Espinaca (hoy), pollo en trozos (lunes) y yogur (miércoles).');
    expect(first?.itemId).toBeNull();
    expect(result[1]?.id).toBe('summary-2026-11-08');
    expect(result[1]?.title).toBe('Esta semana vence: Lechuga');
  });

  it('con un solo producto permite responder desde el aviso', () => {
    const [first] = plan([item('yogur', '2026-11-03')]);
    expect(first?.categoryId).toBe('single_item');
    expect(first?.itemId).not.toBeNull();
  });

  it('respeta el día elegido', () => {
    const [first] = plan([item('yogur', '2026-11-05')], { summaryWeekday: 3 });
    // El próximo miércoles es el 4 de noviembre.
    expect(first?.id).toBe('summary-2026-11-04');
  });

  it('si hoy es el día y ya pasó la hora, parte la semana siguiente', () => {
    const sunday = new Date('2026-11-01T15:00:00-03:00');
    const result = plan(
      [item('yogur', '2026-11-02'), item('lechuga', '2026-11-09')],
      {},
      '2026-11-01',
      sunday,
    );
    expect(result.map((p) => p.id)).toEqual(['summary-2026-11-08']);
  });

  it('no avisa lo congelado, lo silenciado ni la larga duración', () => {
    expect(plan([item('carne-molida', '2026-11-02', { location: 'freezer' })])).toEqual([]);
    expect(plan([item('yogur', '2026-11-02')], { mutedCategories: ['lacteos'] })).toEqual([]);
    expect(plan([item('arroz', '2026-11-02', { location: 'pantry' })])).toEqual([]);
    expect(
      plan([item('arroz', '2026-11-02', { location: 'pantry' })], { longLifeAlerts: true }),
    ).toHaveLength(1);
  });

  it('el interruptor general apaga todo', () => {
    expect(plan([item('yogur', '2026-11-02')], { notificationsEnabled: false })).toEqual([]);
  });

  it('lista hasta tres y resume el resto', () => {
    const items = ['yogur', 'lechuga', 'espinaca', 'frutilla', 'crema'].map((id) =>
      item(id, '2026-11-03'),
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

  it('si el silencio empieza antes de la hora elegida, el aviso pasa a la mañana siguiente', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      summaryHour: 21,
      summaryMinute: 30,
      quietStart: 21 * 60,
    };
    const date = summaryTime('2026-11-08', settings);
    expect([date.getDate(), date.getHours(), date.getMinutes()]).toEqual([9, 8, 0]);
    // De madrugada, el final del silencio es el mismo día.
    const early = summaryTime('2026-11-08', { ...settings, summaryHour: 7, summaryMinute: 0 });
    expect([early.getDate(), early.getHours()]).toEqual([8, 8]);
  });

  it('nunca programa de noche', () => {
    const [first] = plan([item('yogur', '2026-11-02')], { summaryHour: 6, summaryMinute: 0 });
    expect(first?.date.getHours()).toBe(8);
    expect(first?.date.getMinutes()).toBe(0);
  });
});

describe('cambio de horario y límite de iOS', () => {
  it('sigue saliendo a las 10:00 cuando Chile atrasa la hora', () => {
    // El 5 de abril de 2026 Chile pasa de UTC-3 a UTC-4. Los domingos 29 mar y 5 abr.
    const items = [item('yogur', '2026-03-30'), item('lechuga', '2026-04-06')];
    const result = plan(items, {}, '2026-03-26', new Date('2026-03-26T12:00:00-03:00'));
    expect(result.map((p) => [p.id, p.date.getHours(), p.date.getMinutes()])).toEqual([
      ['summary-2026-03-29', 10, 0],
      ['summary-2026-04-05', 10, 0],
    ]);
    expect(result[0]?.date.toISOString()).toBe('2026-03-29T13:00:00.000Z');
    expect(result[1]?.date.toISOString()).toBe('2026-04-05T14:00:00.000Z');
  });

  it('programa como máximo unas pocas semanas, muy lejos del límite de 64', () => {
    const items = Array.from({ length: 60 }, (_, i) => {
      const day = new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10);
      return item('yogur', day);
    });
    const result = plan(items);
    expect(result.length).toBe(PLAN_WEEKS);
    expect(result.length).toBeLessThan(IOS_LIMIT);
  });
});
