import { makeItem } from '@/db/test-items';

import { cookedActions, itemsUsedBy } from './cooked';
import type { IngredientMatch } from './ranking';

const tomato = makeItem('tomate', '2026-11-05', { quantity: 3 });
const cheese = makeItem('queso-gauda', '2026-11-10', { quantity: 0.25, unit: 'kg' });

it('itemsUsedBy no repite productos', () => {
  const ingredient = { p: 'tomate', n: 'Tomate', q: 1, u: 'un' };
  const matches: IngredientMatch[] = [
    { ingredient, item: tomato, basic: false },
    { ingredient, item: tomato, basic: false },
    { ingredient, item: null, basic: true },
    { ingredient, item: cheese, basic: false },
  ];
  expect(itemsUsedBy(matches)).toEqual([tomato, cheese]);
});

it('cookedActions descuenta todo, la mitad o nada', () => {
  expect(cookedActions([tomato, cheese], { [tomato.id]: 'half', [cheese.id]: 'none' })).toEqual([
    { item: tomato, action: { type: 'consume', quantity: 1.5 } },
  ]);
  expect(cookedActions([tomato], {})).toEqual([{ item: tomato, action: { type: 'consume' } }]);
});
