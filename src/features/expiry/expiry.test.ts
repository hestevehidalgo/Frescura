import { getCatalogProduct, type Product } from '@/features/catalog/catalog';

import {
  canExtendShelfLife,
  estimateExpiry,
  expiryAfterFreezing,
  expiryAfterMoving,
  expiryAfterOpening,
  expiryAfterThawing,
  factorAfterLastedLonger,
  factorAfterSpoiledEarly,
  isHighRisk,
  locationAfterOpening,
  printedExpiry,
  urgencyOf,
  userExpiry,
} from './expiry';

function product(id: string): Product {
  const p = getCatalogProduct(id);
  if (!p) {
    throw new Error(`Falta ${id} en el catálogo`);
  }
  return p;
}

const BOUGHT = '2026-11-02';

describe('estimateExpiry', () => {
  it('usa la fecha de compra más los días mínimos', () => {
    // Yogur en el refri: 7 a 14 días.
    const e = estimateExpiry({
      product: product('yogur'),
      location: 'fridge',
      purchasedAt: BOUGHT,
    });
    expect(e).toEqual({ expiresAt: '2026-11-09', source: 'estimated', latestAt: '2026-11-16' });
  });

  it('depende del lugar', () => {
    const fridge = estimateExpiry({
      product: product('manzana'),
      location: 'fridge',
      purchasedAt: BOUGHT,
    });
    const pantry = estimateExpiry({
      product: product('manzana'),
      location: 'pantry',
      purchasedAt: BOUGHT,
    });
    expect(fridge.expiresAt > pantry.expiresAt).toBe(true);
  });

  it('la palta madura dura menos', () => {
    const p = product('palta');
    const unripe = estimateExpiry({ product: p, location: 'pantry', purchasedAt: BOUGHT });
    const ripe = estimateExpiry({
      product: p,
      location: 'fridge',
      purchasedAt: BOUGHT,
      ripe: true,
    });
    expect(unripe.expiresAt).toBe('2026-11-05');
    expect(ripe.expiresAt).toBe('2026-11-04');
    expect(ripe.latestAt).toBe('2026-11-05');
  });

  it('algo de alto riesgo fuera del refri vence el mismo día', () => {
    const e = estimateExpiry({
      product: product('pollo-trozos'),
      location: 'pantry',
      purchasedAt: BOUGHT,
    });
    expect(e.expiresAt).toBe(BOUGHT);
  });

  it('aplica el ajuste personal hacia abajo siempre', () => {
    const e = estimateExpiry({
      product: product('lechuga'),
      location: 'fridge',
      purchasedAt: BOUGHT,
      factor: 0.5,
    });
    expect(e.expiresAt).toBe('2026-11-03'); // 3 días × 0,5 = 1
  });

  it('nunca alarga la vida útil de carnes ni lácteos frescos', () => {
    for (const id of ['carne-molida', 'pescado-fresco', 'quesillo', 'sobras']) {
      const base = estimateExpiry({
        product: product(id),
        location: 'fridge',
        purchasedAt: BOUGHT,
      });
      const boosted = estimateExpiry({
        product: product(id),
        location: 'fridge',
        purchasedAt: BOUGHT,
        factor: 1.5,
      });
      expect(boosted.expiresAt).toBe(base.expiresAt);
    }
  });

  it('sí alarga la de productos de bajo riesgo', () => {
    const base = estimateExpiry({
      product: product('zanahoria'),
      location: 'fridge',
      purchasedAt: BOUGHT,
    });
    const boosted = estimateExpiry({
      product: product('zanahoria'),
      location: 'fridge',
      purchasedAt: BOUGHT,
      factor: 1.5,
    });
    expect(boosted.expiresAt > base.expiresAt).toBe(true);
  });
});

describe('abrir, congelar, descongelar y mover', () => {
  it('leche larga vida: meses cerrada, pocos días abierta y pasa al refri', () => {
    const p = product('leche-larga-vida');
    const closed = estimateExpiry({ product: p, location: 'pantry', purchasedAt: BOUGHT });
    expect(closed.expiresAt).toBe('2027-01-31'); // 90 días
    expect(locationAfterOpening(p, 'pantry')).toBe('fridge');
    const opened = expiryAfterOpening(p, closed, 'pantry', '2026-11-20');
    expect(opened.expiresAt).toBe('2026-11-24');
  });

  it('al abrir gana la fecha más temprana', () => {
    const p = product('yogur');
    const nearlyDue = printedExpiry('2026-11-05');
    expect(expiryAfterOpening(p, nearlyDue, 'fridge', '2026-11-04')).toEqual(nearlyDue);
  });

  it('el aceite abierto se queda en la despensa', () => {
    expect(locationAfterOpening(product('aceite'), 'pantry')).toBe('pantry');
  });

  it('al congelar parte de nuevo con la vida de congelador', () => {
    const e = expiryAfterFreezing(product('carne-molida'), '2026-11-03');
    expect(e.expiresAt).toBe('2027-02-01'); // 90 días
  });

  it('al descongelar, vida útil corta', () => {
    expect(expiryAfterThawing(product('carne-molida'), '2026-12-10').expiresAt).toBe('2026-12-11');
  });

  it('mover algo estimado recalcula desde hoy sin pasar el máximo', () => {
    const p = product('palta');
    const current = estimateExpiry({ product: p, location: 'pantry', purchasedAt: BOUGHT });
    const moved = expiryAfterMoving(p, current, 'fridge', BOUGHT, '2026-11-04');
    expect(moved.expiresAt).toBe('2026-11-07'); // hoy + 3 días en el refri, tope compra + 5
  });

  it('mover no cambia una fecha real', () => {
    const p = product('yogur');
    const real = printedExpiry('2026-11-20');
    expect(expiryAfterMoving(p, real, 'pantry', BOUGHT, '2026-11-04')).toEqual(real);
    const mine = userExpiry('2026-11-21');
    expect(expiryAfterMoving(p, mine, 'pantry', BOUGHT, '2026-11-04')).toEqual(mine);
  });
});

describe('urgencia', () => {
  const today = '2026-11-10';
  it.each([
    ['2026-11-09', 'expired'],
    ['2026-11-10', 'today'],
    ['2026-11-11', 'soon'],
    ['2026-11-13', 'soon'],
    ['2026-11-14', 'week'],
    ['2026-11-17', 'week'],
    ['2026-11-18', 'later'],
  ])('%s → %s', (date, urgency) => {
    expect(urgencyOf(date, today)).toBe(urgency);
  });
});

describe('aprendizaje personal', () => {
  it('se echó a perder antes: acorta hasta un mínimo', () => {
    expect(factorAfterSpoiledEarly(1)).toBe(0.8);
    expect(factorAfterSpoiledEarly(0.55)).toBe(0.5);
  });

  it('duró más: alarga con cautela solo en bajo riesgo', () => {
    expect(factorAfterLastedLonger(product('zanahoria'), 1)).toBe(1.1);
    expect(factorAfterLastedLonger(product('zanahoria'), 1.45)).toBe(1.5);
    expect(factorAfterLastedLonger(product('pollo-trozos'), 1)).toBe(1);
    expect(factorAfterLastedLonger(product('yogur'), 1)).toBe(1);
    expect(factorAfterLastedLonger(product('sobras'), 0.8)).toBe(0.8);
  });

  it('clasifica el riesgo', () => {
    expect(isHighRisk(product('sobras'))).toBe(true);
    expect(isHighRisk(product('longaniza'))).toBe(true);
    expect(isHighRisk(product('lechuga'))).toBe(false);
    expect(canExtendShelfLife(product('quesillo'))).toBe(false);
  });
});
