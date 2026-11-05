import { makeItem } from '@/db/test-items';

import { alreadyHave, missingToShopping, shoppingFromText } from './shopping';

it('alreadyHave suma los lotes activos del mismo producto', () => {
  const items = [
    makeItem('palta', '2026-11-10', { quantity: 2 }),
    makeItem('palta', '2026-11-07', { quantity: 1 }),
    makeItem('palta', '2026-11-01', { status: 'consumed' }),
    makeItem('tomate', '2026-11-05'),
  ];
  expect(alreadyHave({ name: 'Paltas', productId: null }, items)).toEqual({
    quantity: 3,
    unit: 'un',
    expiresAt: '2026-11-07',
    lots: 2,
  });
  expect(alreadyHave({ name: 'Limón', productId: 'limon' }, items)).toBeNull();
  expect(alreadyHave({ name: 'Cosa rara', productId: null }, items)).toBeNull();
});

it('missingToShopping usa el primer producto de las alternativas', () => {
  expect(
    missingToShopping([{ p: ['pollo-trozos', 'pollo-entero'], n: 'pollo', q: 500, u: 'g' }]),
  ).toEqual([
    { name: 'Pollo', productId: 'pollo-trozos', quantity: 500, unit: 'g', source: 'recipe' },
  ]);
});

it('shoppingFromText reconoce productos del catálogo', () => {
  expect(shoppingFromText('  tomates ')).toEqual({
    name: 'Tomates',
    productId: 'tomate',
    source: 'manual',
  });
  expect(shoppingFromText('detergente')).toEqual({
    name: 'Detergente',
    productId: null,
    source: 'manual',
  });
  expect(shoppingFromText('x')).toBeNull();
});
