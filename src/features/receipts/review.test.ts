import type { Db } from '@/db/db';
import { getItem, listItems } from '@/db/inventory-repo';
import { findReceipt, listReceipts } from '@/db/receipts-repo';
import { createMigratedDb } from '@/db/test-db';

import type { ParsedReceipt } from '../../../supabase/functions/parse-receipt/logic';

import { buildReview, normalizeRut, reviewMismatch, saveReview, undoSavedReview } from './review';

const TODAY = '2026-10-31';

const RECEIPT: ParsedReceipt = {
  m: 'Líder',
  r: '76.134.941-4',
  d: '2026-10-30',
  fo: '998877',
  t: 9485,
  ds: 500,
  l: [
    {
      x: 'LECHE ENT COLUN 1L',
      n: 'Leche entera',
      b: 'Colún',
      q: 2,
      u: 'l',
      p: 2180,
      c: 'lacteos',
      f: true,
      s: 'pantry',
      k: 0.95,
    },
    {
      x: 'PECH POLLO DESH',
      n: 'Pechuga de pollo',
      b: null,
      q: 1,
      u: 'un',
      p: 4990,
      c: 'aves',
      f: true,
      s: 'fridge',
      k: 0.9,
    },
    {
      x: 'QUINOA BLANCA 500G',
      n: 'quinoa blanca',
      b: null,
      q: 1,
      u: 'un',
      p: 1765,
      c: 'abarrotes',
      f: true,
      s: 'pantry',
      k: 0.4,
    },
    {
      x: 'DET LIQ 3L',
      n: 'Detergente líquido',
      b: null,
      q: 1,
      u: 'un',
      p: 1000,
      c: 'otros',
      f: false,
      s: 'pantry',
      k: 0.9,
    },
    {
      x: 'BOLSA',
      n: 'Bolsa',
      b: null,
      q: 1,
      u: 'un',
      p: 50,
      c: 'otros',
      f: false,
      s: 'pantry',
      k: 0.9,
    },
  ],
};

describe('buildReview', () => {
  const review = buildReview(RECEIPT, TODAY, 'hash-1');

  it('reconoce productos del catálogo y deja el resto con su categoría', () => {
    const [leche, pollo, quinoa] = review.rows;
    expect(leche?.catalogProduct?.id).toBe('leche-larga-vida');
    expect(leche?.name).toBe('Leche entera');
    expect(pollo?.catalogProduct?.id).toBe('pollo-trozos');
    expect(quinoa).toMatchObject({
      catalogProduct: null,
      name: 'Quinoa blanca',
      categoryId: 'abarrotes',
    });
  });

  it('excluye lo que no es alimento y resalta lo dudoso', () => {
    expect(review.rows.map((r) => r.include)).toEqual([true, true, true, false, false]);
    expect(review.rows.map((r) => r.lowConfidence)).toEqual([false, false, true, false, false]);
  });

  it('cuadra el total con los descuentos', () => {
    // 2180 + 4990 + 1765 + 1000 + 50 - 500 = 9485
    expect(review.mismatchClp).toBeNull();
    const off = buildReview({ ...RECEIPT, t: 12000 }, TODAY, null);
    expect(off.mismatchClp).toBe(9485 - 12000);
  });

  it('usa la fecha de la boleta, nunca una futura', () => {
    expect(review.purchasedAt).toBe('2026-10-30');
    expect(buildReview({ ...RECEIPT, d: '2027-01-01' }, TODAY, null).purchasedAt).toBe(TODAY);
    expect(buildReview({ ...RECEIPT, d: null }, TODAY, null).purchasedAt).toBe(TODAY);
  });

  it('arma la huella con RUT y folio', () => {
    expect(review.fingerprint).toBe('761349414|998877');
    expect(normalizeRut('76.134.941-k')).toBe('76134941K');
    expect(buildReview({ ...RECEIPT, fo: null }, TODAY, null).fingerprint).toBeNull();
  });
});

describe('saveReview', () => {
  let db: Db;
  beforeEach(async () => {
    db = await createMigratedDb();
  });

  it('guarda la boleta y solo los productos incluidos, con precio y fecha de compra', async () => {
    const review = buildReview(RECEIPT, TODAY, 'hash-1');
    const saved = await saveReview(db, review);
    expect(saved.itemIds).toHaveLength(3);
    const items = await listItems(db);
    expect(items.map((i) => i.displayName).sort()).toEqual([
      'Leche entera',
      'Pechuga de pollo',
      'Quinoa blanca',
    ]);
    const leche = await getItem(db, saved.itemIds[0] ?? '');
    expect(leche).toMatchObject({
      quantity: 2,
      unit: 'l',
      priceClp: 2180,
      purchasedAt: '2026-10-30',
      receiptId: saved.receiptId,
    });
    expect(await findReceipt(db, { fingerprint: '761349414|998877' })).not.toBeNull();
    expect(await findReceipt(db, { imageHash: 'hash-1' })).not.toBeNull();
  });

  it('se puede guardar una boleta repetida si la persona insiste (sin romper la huella única)', async () => {
    await saveReview(db, buildReview(RECEIPT, TODAY, 'hash-1'));
    const again = await saveReview(db, buildReview(RECEIPT, TODAY, 'hash-2'));
    expect(again.itemIds).toHaveLength(3);
    expect(await listReceipts(db)).toHaveLength(2);
  });

  it('deshacer borra la boleta y sus productos', async () => {
    const saved = await saveReview(db, buildReview(RECEIPT, TODAY, null));
    await undoSavedReview(db, saved);
    expect(await listItems(db)).toHaveLength(0);
    expect(await listReceipts(db)).toHaveLength(0);
  });
});

it('reviewMismatch se recalcula al corregir un precio', () => {
  const rows = [{ priceClp: 1000 }, { priceClp: 129 }];
  // La IA leyó 129 en vez de 1.290: no cuadra con el total de $2.290.
  expect(reviewMismatch(rows, 2290, 0)).toBe(-1161);
  expect(reviewMismatch([{ priceClp: 1000 }, { priceClp: 1290 }], 2290, 0)).toBeNull();
  expect(reviewMismatch(rows, null, 0)).toBeNull();
});
