import { getCatalogProduct } from '@/features/catalog/catalog';
import { addToInventory, performAction } from '@/features/inventory/service';

import { exportBackup, parseBackup, restoreBackup } from './backup';
import { listEvents, listItems } from './inventory-repo';
import { SCHEMA_VERSION } from './migrations';
import { saveUserRecipe } from './recipes-repo';
import { getSettings, saveSettings } from './settings-repo';
import { createMigratedDb } from './test-db';

it('exporta e importa todo en otro celular', async () => {
  const source = await createMigratedDb();
  const palta = getCatalogProduct('palta');
  if (!palta) {
    throw new Error('palta');
  }
  const item = await addToInventory(source, { product: palta, quantity: 3, priceClp: 2990 });
  await performAction(source, item.id, { type: 'consume', quantity: 1 });
  await saveSettings(source, { diet: 'vegetarian', summaryHour: 18 });
  await saveUserRecipe(source, {
    id: 'user-1',
    t: 'Mi receta',
    s: 2,
    m: 30,
    d: 1,
    tags: [],
    e: [],
    i: [{ p: 'palta', n: 'palta', q: 1, u: 'un' }],
    st: ['Paso.'],
    source: 'user',
  });

  const text = JSON.stringify(await exportBackup(source));
  const parsed = parseBackup(text);
  if ('error' in parsed) {
    throw new Error(parsed.error);
  }

  const target = await createMigratedDb();
  const other = getCatalogProduct('tomate');
  if (other) {
    await addToInventory(target, { product: other, quantity: 1 });
  }
  expect(await restoreBackup(target, parsed)).toEqual({ items: 1 });

  const items = await listItems(target);
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ productId: 'palta', quantity: 2, priceClp: 2990 });
  expect((await listEvents(target, item.id)).map((e) => e.type)).toEqual(['added', 'consumed']);
  expect(await getSettings(target)).toMatchObject({ diet: 'vegetarian', summaryHour: 18 });
  expect(await target.getAllAsync('SELECT id FROM user_recipes')).toEqual([{ id: 'user-1' }]);
});

it('ignora columnas desconocidas de otra versión', async () => {
  const db = await createMigratedDb();
  const backup = await exportBackup(db);
  backup.tables.settings.push({ key: 'diet', value: '"vegan"', columna_futura: 1 });
  await restoreBackup(db, backup);
  expect((await getSettings(db)).diet).toBe('vegan');
});

describe('parseBackup', () => {
  it('rechaza archivos que no son respaldos', () => {
    expect(parseBackup('hola')).toEqual({ error: 'invalid' });
    expect(parseBackup('{"app":"otra"}')).toEqual({ error: 'invalid' });
    expect(
      parseBackup(
        JSON.stringify({ app: 'frescura', schemaVersion: 1, tables: { settings: [{ key: {} }] } }),
      ),
    ).toEqual({ error: 'invalid' });
  });

  it('rechaza respaldos de una versión más nueva de la app', () => {
    expect(
      parseBackup(
        JSON.stringify({ app: 'frescura', schemaVersion: SCHEMA_VERSION + 1, tables: {} }),
      ),
    ).toEqual({ error: 'newer' });
  });
});
