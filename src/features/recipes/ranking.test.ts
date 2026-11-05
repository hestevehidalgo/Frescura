import { makeItem } from '@/db/test-items';

import {
  missingCost,
  rankRecipes,
  scoreRecipe,
  urgencyWeight,
  type RecipePreferences,
} from './ranking';
import { allBaseRecipes, getBaseRecipe } from './recipes';

const TODAY = '2026-11-02';
const item = makeItem;

const PREFS: RecipePreferences = {
  diet: 'none',
  avoid: [],
  equipment: ['olla', 'sarten', 'horno', 'microondas', 'licuadora'],
  pantryBasics: ['sal', 'aceite', 'azucar', 'harina', 'ajo'],
};

// Un refri típico después de una compra de hace unos días.
const INVENTORY = [
  item('pollo-trozos', '2026-11-03'),
  item('zapallo-italiano', '2026-11-04'),
  item('espinaca', '2026-11-04'),
  item('tomate', '2026-11-05'),
  item('palta', '2026-11-04'),
  item('lechuga', '2026-11-05'),
  item('huevos', '2026-11-20'),
  item('zanahoria', '2026-11-08'),
  item('papa', '2026-11-25', { location: 'pantry' }),
  item('cebolla', '2026-12-10', { location: 'pantry' }),
  item('leche-larga-vida', '2027-01-30', { location: 'pantry' }),
  item('arroz', '2027-10-01', { location: 'pantry' }),
];

describe('urgencia', () => {
  it('lo que vence antes pesa más; lo vencido y lo congelado no suman', () => {
    expect(urgencyWeight(item('yogur', TODAY), TODAY)).toBe(5);
    expect(urgencyWeight(item('yogur', '2026-11-04'), TODAY)).toBe(4);
    expect(urgencyWeight(item('yogur', '2026-11-08'), TODAY)).toBe(2);
    expect(urgencyWeight(item('yogur', '2026-11-20'), TODAY)).toBe(0);
    expect(urgencyWeight(item('yogur', '2026-11-01'), TODAY)).toBe(0);
    expect(urgencyWeight(item('carne-molida', TODAY, { location: 'freezer' }), TODAY)).toBe(0);
  });
});

describe('scoreRecipe', () => {
  it('cuenta lo que tienes, los básicos y lo que falta', () => {
    const tortilla = getBaseRecipe('tortilla-de-verduras');
    const ranked = scoreRecipe(tortilla!, INVENTORY, TODAY, PREFS.pantryBasics);
    expect(ranked.missing).toEqual([]);
    expect(ranked.expiring.map((i) => i.productId).sort()).toEqual([
      'espinaca',
      'zapallo-italiano',
    ]);
  });

  it('no usa productos vencidos', () => {
    const pollo = getBaseRecipe('pollo-arvejado');
    const ranked = scoreRecipe(pollo!, [item('pollo-trozos', '2026-11-01')], TODAY, []);
    expect(ranked.matches.find((m) => m.ingredient.n.includes('Pollo'))?.item).toBeNull();
  });

  it('usa alternativas (leche fresca o larga vida)', () => {
    const pure = getBaseRecipe('pure-con-huevo');
    const ranked = scoreRecipe(pure!, INVENTORY, TODAY, []);
    expect(ranked.matches.find((m) => m.ingredient.n === 'Leche')?.item?.productId).toBe(
      'leche-larga-vida',
    );
  });
});

describe('rankRecipes', () => {
  it('criterio de la fase 3: las 5 primeras usan al menos 2 productos por vencer', () => {
    const top = rankRecipes(allBaseRecipes(), INVENTORY, TODAY, PREFS).slice(0, 5);
    for (const ranked of top) {
      expect([ranked.recipe.id, ranked.expiring.length >= 2]).toEqual([ranked.recipe.id, true]);
    }
  });

  it('respeta la dieta, las alergias y el equipamiento', () => {
    const vegetarian = rankRecipes(allBaseRecipes(), INVENTORY, TODAY, {
      ...PREFS,
      diet: 'vegetarian',
    });
    expect(vegetarian.some((r) => r.recipe.id === 'cazuela-de-pollo')).toBe(false);

    const noEgg = rankRecipes(allBaseRecipes(), INVENTORY, TODAY, { ...PREFS, avoid: ['huevo'] });
    expect(noEgg.some((r) => r.recipe.id === 'tortilla-de-verduras')).toBe(false);

    const noOven = rankRecipes(allBaseRecipes(), INVENTORY, TODAY, {
      ...PREFS,
      equipment: ['olla', 'sarten'],
    });
    expect(noOven.some((r) => r.recipe.e.includes('horno'))).toBe(false);
    expect(noOven.some((r) => r.recipe.id === 'ensalada-chilena')).toBe(true);
  });
});

it('pesa el doble que falte la carne, el pollo o el pescado', () => {
  expect(missingCost({ p: 'pollo-trozos', n: 'Pollo', q: 1, u: 'kg' })).toBe(2);
  expect(missingCost({ p: ['pescado-fresco', 'tomate'], n: 'Pescado', q: 1, u: 'kg' })).toBe(2);
  expect(missingCost({ p: 'pollo-asado', n: 'Pollo asado', q: 250, u: 'g' })).toBe(1);
  expect(missingCost({ p: 'limon', n: 'Limón', q: 1, u: 'un' })).toBe(1);
  // Con lechuga y tomate, la ensalada sin pescado no debe ganarle a una receta sin proteína.
  const today = '2026-11-02';
  const items = [makeItem('lechuga', '2026-11-04'), makeItem('tomate', '2026-11-04')];
  const ranked = rankRecipes(allBaseRecipes(), items, today, PREFS);
  const top = ranked[0]?.recipe;
  expect(top && top.i.some((i) => missingCost(i) === 2 && !i.o)).toBe(false);
});
