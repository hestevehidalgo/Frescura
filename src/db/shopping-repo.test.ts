import {
  addShopping,
  clearCheckedShopping,
  listShopping,
  removeShopping,
  setShoppingChecked,
} from './shopping-repo';
import { createMigratedDb } from './test-db';

it('agrega sin repetir, marca, borra lo comprado', async () => {
  const db = await createMigratedDb();
  expect(await addShopping(db, { name: 'Tomate', productId: 'tomate' })).toBe(true);
  expect(await addShopping(db, { name: 'tomates', productId: 'tomate' })).toBe(false);
  expect(await addShopping(db, { name: '  Pan   amasado ' })).toBe(true);
  expect(await addShopping(db, { name: 'pan amasado' })).toBe(false);
  expect(await addShopping(db, { name: '   ' })).toBe(false);

  let list = await listShopping(db);
  expect(list.map((i) => i.name)).toEqual(['Tomate', 'Pan amasado']);

  const tomate = list[0];
  await setShoppingChecked(db, tomate?.id ?? '', true);
  list = await listShopping(db);
  // Lo comprado va al final.
  expect(list.map((i) => [i.name, i.checked])).toEqual([
    ['Pan amasado', false],
    ['Tomate', true],
  ]);
  // Ya comprado: se puede volver a agregar como pendiente.
  expect(await addShopping(db, { name: 'Tomate', productId: 'tomate' })).toBe(true);

  expect(await clearCheckedShopping(db)).toBe(1);
  const pan = (await listShopping(db)).find((i) => i.name === 'Pan amasado');
  await removeShopping(db, pan?.id ?? '');
  expect((await listShopping(db)).map((i) => i.name)).toEqual(['Tomate']);
});
