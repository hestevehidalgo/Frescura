import type { Db } from '@/db/db';
import { archiveUnanswered, getItem, listEvents, listItems } from '@/db/inventory-repo';
import { migrate } from '@/db/migrations';
import {
  createCustomProduct,
  findBarcode,
  findProduct,
  getShelfLifeFactor,
  saveBarcode,
  searchCustomProducts,
} from '@/db/products-repo';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '@/db/settings-repo';
import { createMigratedDb } from '@/db/test-db';
import { getCatalogProduct, type Product } from '@/features/catalog/catalog';

import { addToInventory, performAction, undoAction } from './service';

function product(id: string): Product {
  const p = getCatalogProduct(id);
  if (!p) {
    throw new Error(id);
  }
  return p;
}

let db: Db;
beforeEach(async () => {
  db = await createMigratedDb();
});

describe('migraciones', () => {
  it('se pueden correr dos veces sin error', async () => {
    await migrate(db);
    expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 1 });
  });
});

describe('agregar', () => {
  it('guarda con fecha estimada y evento', async () => {
    const item = await addToInventory(db, {
      product: product('yogur'),
      quantity: 4,
      purchasedAt: '2026-11-02',
      priceClp: 1990,
    });
    const saved = await getItem(db, item.id);
    expect(saved).toMatchObject({
      displayName: 'Yogur',
      quantity: 4,
      unit: 'un',
      location: 'fridge',
      priceClp: 1990,
      expiresAt: '2026-11-09',
      expirySource: 'estimated',
      status: 'active',
    });
    expect((await listEvents(db, item.id)).map((e) => e.type)).toEqual(['added']);
  });

  it('la fecha del envase reemplaza a la estimada', async () => {
    const item = await addToInventory(db, {
      product: product('yogur'),
      quantity: 1,
      purchasedAt: '2026-11-02',
      printedDate: '2026-11-20',
    });
    expect(item).toMatchObject({
      expiresAt: '2026-11-20',
      expirySource: 'printed',
      latestAt: null,
    });
  });

  it('lista ordenado por vencimiento', async () => {
    await addToInventory(db, { product: product('arroz'), quantity: 1, purchasedAt: '2026-11-02' });
    await addToInventory(db, {
      product: product('carne-molida'),
      quantity: 0.5,
      purchasedAt: '2026-11-02',
    });
    const names = (await listItems(db)).map((i) => i.displayName);
    expect(names).toEqual(['Carne molida', 'Arroz']);
  });
});

describe('acciones con deshacer', () => {
  it('me lo comí y deshacer', async () => {
    const item = await addToInventory(db, { product: product('yogur'), quantity: 1 });
    const handle = await performAction(db, item.id, { type: 'consume' });
    expect((await getItem(db, item.id))?.status).toBe('consumed');
    expect(await listItems(db)).toHaveLength(0);
    await undoAction(db, handle);
    expect((await getItem(db, item.id))?.status).toBe('active');
    expect((await listEvents(db, item.id)).map((e) => e.type)).toEqual(['added']);
  });

  it('usé 1 de 6', async () => {
    const item = await addToInventory(db, { product: product('huevos'), quantity: 6 });
    await performAction(db, item.id, { type: 'consume', quantity: 1 });
    expect(await getItem(db, item.id)).toMatchObject({ quantity: 5, status: 'active' });
  });

  it('usé la mitad de un kilo', async () => {
    const item = await addToInventory(db, { product: product('papa'), quantity: 1.5 });
    await performAction(db, item.id, { type: 'consume', quantity: 0.75 });
    expect((await getItem(db, item.id))?.quantity).toBe(0.75);
  });

  it('lo boté con motivo', async () => {
    const item = await addToInventory(db, { product: product('lechuga'), quantity: 1 });
    await performAction(db, item.id, { type: 'discard', reason: 'disliked' });
    expect(await getItem(db, item.id)).toMatchObject({
      status: 'discarded',
      discardReason: 'disliked',
    });
  });

  it('se echó a perder antes: acorta la próxima vez, y deshacer lo revierte', async () => {
    const lechuga = product('lechuga');
    const item = await addToInventory(db, {
      product: lechuga,
      quantity: 1,
      purchasedAt: '2026-11-02',
    });
    const handle = await performAction(
      db,
      item.id,
      { type: 'discard', reason: 'spoiled' },
      '2026-11-03',
    );
    expect(await getShelfLifeFactor(db, 'lechuga')).toBe(0.8);
    await undoAction(db, handle);
    expect(await getShelfLifeFactor(db, 'lechuga')).toBe(1);
  });

  it('comer algo de alto riesgo vencido no alarga su vida útil', async () => {
    const item = await addToInventory(db, {
      product: product('carne-molida'),
      quantity: 1,
      purchasedAt: '2026-11-02',
    });
    await performAction(db, item.id, { type: 'consume' }, '2026-11-10');
    expect(await getShelfLifeFactor(db, 'carne-molida')).toBe(1);
  });

  it('lo abrí: leche larga vida pasa al refri con fecha corta', async () => {
    const item = await addToInventory(db, {
      product: product('leche-larga-vida'),
      quantity: 1,
      purchasedAt: '2026-11-02',
    });
    await performAction(db, item.id, { type: 'open' }, '2026-11-10');
    expect(await getItem(db, item.id)).toMatchObject({
      location: 'fridge',
      openedAt: '2026-11-10',
      expiresAt: '2026-11-14',
    });
  });

  it('lo congelé y lo descongelé', async () => {
    const item = await addToInventory(db, {
      product: product('carne-molida'),
      quantity: 1,
      purchasedAt: '2026-11-02',
    });
    await performAction(db, item.id, { type: 'freeze' }, '2026-11-02');
    expect(await getItem(db, item.id)).toMatchObject({
      location: 'freezer',
      expiresAt: '2027-01-31',
    });
    await performAction(db, item.id, { type: 'thaw' }, '2026-12-01');
    expect(await getItem(db, item.id)).toMatchObject({
      location: 'fridge',
      thawedAt: '2026-12-01',
      expiresAt: '2026-12-02',
    });
  });

  it('mover al congelador equivale a congelar', async () => {
    const item = await addToInventory(db, { product: product('marraqueta'), quantity: 4 });
    await performAction(db, item.id, { type: 'move', location: 'freezer' });
    expect((await getItem(db, item.id))?.frozenAt).not.toBeNull();
  });

  it('cambiar la fecha a mano', async () => {
    const item = await addToInventory(db, { product: product('yogur'), quantity: 1 });
    await performAction(db, item.id, { type: 'setExpiry', date: '2026-12-24', source: 'user' });
    expect(await getItem(db, item.id)).toMatchObject({
      expiresAt: '2026-12-24',
      expirySource: 'user',
    });
  });

  it('editar la fecha de compra vuelve a estimar', async () => {
    const item = await addToInventory(db, {
      product: product('yogur'),
      quantity: 1,
      purchasedAt: '2026-11-02',
    });
    await performAction(db, item.id, { type: 'edit', fields: { purchasedAt: '2026-11-05' } });
    expect((await getItem(db, item.id))?.expiresAt).toBe('2026-11-12');
  });

  it('dividir y deshacer', async () => {
    const item = await addToInventory(db, { product: product('marraqueta'), quantity: 6 });
    const handle = await performAction(db, item.id, { type: 'split', quantity: 3 });
    expect((await listItems(db)).map((i) => i.quantity).sort()).toEqual([3, 3]);
    await undoAction(db, handle);
    const items = await listItems(db);
    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(6);
  });

  it('deshacer un agregado lo borra', async () => {
    const item = await addToInventory(db, { product: product('yogur'), quantity: 1 });
    const [added] = await listEvents(db, item.id);
    await undoAction(db, { eventId: added?.id ?? '' });
    expect(await getItem(db, item.id)).toBeNull();
  });
});

describe('cierre del ciclo', () => {
  it('archiva como "sin información" lo vencido sin respuesta', async () => {
    const old = await addToInventory(db, {
      product: product('yogur'),
      quantity: 1,
      purchasedAt: '2026-10-01',
    });
    const fresh = await addToInventory(db, {
      product: product('yogur'),
      quantity: 1,
      purchasedAt: '2026-11-08',
    });
    expect(await archiveUnanswered(db, '2026-11-05')).toBe(1);
    expect((await getItem(db, old.id))?.status).toBe('unknown');
    expect((await getItem(db, fresh.id))?.status).toBe('active');
  });
});

describe('productos propios y códigos de barras', () => {
  it('crea, busca y resuelve productos propios', async () => {
    const quinoa = await createCustomProduct(db, {
      name: 'Quinoa',
      categoryId: 'abarrotes',
      unit: 'kg',
    });
    expect((await findProduct(db, quinoa.id))?.name).toBe('Quinoa');
    expect((await searchCustomProducts(db, 'quin')).map((p) => p.id)).toEqual([quinoa.id]);
    expect((await findProduct(db, 'palta'))?.name).toBe('Palta');
    expect(await findProduct(db, 'no-existe')).toBeNull();
  });

  it('guarda y actualiza códigos de barras', async () => {
    await saveBarcode(db, {
      ean: '7801234567890',
      productId: 'leche-larga-vida',
      name: 'Leche entera',
      brand: 'Colún',
      source: 'openfoodfacts',
    });
    expect((await findBarcode(db, '7801234567890'))?.brand).toBe('Colún');
    await saveBarcode(db, {
      ean: '7801234567890',
      productId: 'leche-sin-lactosa',
      name: 'Leche sin lactosa',
      brand: 'Colún',
      source: 'user',
    });
    expect((await findBarcode(db, '7801234567890'))?.productId).toBe('leche-sin-lactosa');
  });
});

describe('ajustes', () => {
  it('parte con los valores por defecto y guarda cambios', async () => {
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
    const updated = await saveSettings(db, { summaryHour: 19, daysAhead: 3 });
    expect(updated).toMatchObject({ summaryHour: 19, daysAhead: 3, summaryMinute: 30 });
    expect(await getSettings(db)).toEqual(updated);
  });
});
