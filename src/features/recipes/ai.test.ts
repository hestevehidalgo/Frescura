import { makeItem } from '@/db/test-items';

import { aiErrorKey, aiRecipeToRecipe, buildRecipeRequest } from './ai';
import type { RecipePreferences } from './ranking';

jest.mock('@/lib/supabase', () => ({ getSignedInSupabase: jest.fn() }));

const TODAY = '2026-11-02';
const PREFS: RecipePreferences = {
  diet: 'vegetarian',
  avoid: ['gluten'],
  equipment: ['olla', 'sarten'],
  pantryBasics: ['sal'],
};
const nameOf = (item: { displayName: string }) => item.displayName;

describe('buildRecipeRequest', () => {
  it('manda primero lo que vence antes, sin vencidos ni congelados ni repetidos', () => {
    const request = buildRecipeRequest(
      [
        makeItem('queso-gauda', '2026-11-20'),
        makeItem('tomate', '2026-11-03'),
        makeItem('tomate', '2026-11-04'),
        makeItem('yogur', '2026-11-01'),
        makeItem('carne-molida', '2026-11-03', { location: 'freezer' }),
        makeItem('zapallo-italiano', '2026-11-02'),
      ],
      TODAY,
      PREFS,
      nameOf,
    );
    expect(request).toEqual({
      ingredients: ['zapallo italiano', 'tomate', 'queso gauda'],
      diet: 'vegetarian',
      avoid: ['gluten'],
      equipment: ['olla', 'sarten'],
      servings: 2,
    });
  });

  it('necesita al menos dos ingredientes', () => {
    expect(buildRecipeRequest([makeItem('tomate', '2026-11-05')], TODAY, PREFS, nameOf)).toBeNull();
  });

  it('manda como máximo 6 ingredientes', () => {
    const ids = ['tomate', 'cebolla', 'papa', 'huevos', 'zapallo-italiano', 'queso-gauda', 'arroz'];
    const request = buildRecipeRequest(
      ids.map((id) => makeItem(id, '2026-11-05')),
      TODAY,
      PREFS,
      nameOf,
    );
    expect(request?.ingredients).toHaveLength(6);
  });
});

it('aiRecipeToRecipe enlaza ingredientes con el catálogo', () => {
  const recipe = aiRecipeToRecipe({
    t: 'Tortilla',
    s: 2,
    m: 20,
    d: 1,
    tags: [],
    e: ['sarten'],
    i: [
      { n: 'zapallo italiano', q: 2, u: 'un' },
      { n: 'comino', q: 1, u: 'cdta' },
    ],
    st: ['Paso uno.', 'Paso dos.'],
  });
  expect(recipe.source).toBe('ai');
  expect(recipe.id).toMatch(/^ai-/);
  expect(recipe.i.map((i) => i.p)).toEqual(['zapallo-italiano', null]);
});

it('aiErrorKey', () => {
  expect(aiErrorKey('quota')).toBe('recipes.aiErrors.quota');
  expect(aiErrorKey('busy')).toBe('recipes.aiErrors.busy');
  expect(aiErrorKey('server')).toBe('recipes.aiErrors.failed');
  expect(aiErrorKey('ai_failed')).toBe('recipes.aiErrors.failed');
});
