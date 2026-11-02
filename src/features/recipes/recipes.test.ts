import { getCatalogProduct } from '@/features/catalog/catalog';

import {
  EQUIPMENT,
  allBaseRecipes,
  fitsDiet,
  getBaseRecipe,
  isVegan,
  isVegetarian,
  productIdsOf,
  recipeAllergens,
  type Recipe,
} from './recipes';

function recipe(id: string): Recipe {
  const r = getBaseRecipe(id);
  if (!r) {
    throw new Error(id);
  }
  return r;
}

describe('recetario base', () => {
  const recipes = allBaseRecipes();

  it('tiene entre 50 y 300 recetas con ids únicos', () => {
    expect(recipes.length).toBeGreaterThanOrEqual(50);
    expect(new Set(recipes.map((r) => r.id)).size).toBe(recipes.length);
  });

  it.each(recipes.map((r) => [r.id, r] as const))(
    '%s está completa y enlazada al catálogo',
    (_id, r) => {
      expect(r.t.length).toBeGreaterThan(3);
      expect(r.s).toBeGreaterThan(0);
      expect(r.d).toBeGreaterThanOrEqual(1);
      expect(r.d).toBeLessThanOrEqual(3);
      expect(r.st.length).toBeGreaterThan(0);
      expect(r.i.length).toBeGreaterThan(0);
      for (const equipment of r.e) {
        expect(EQUIPMENT).toContain(equipment);
      }
      for (const ingredient of r.i) {
        expect(ingredient.q).toBeGreaterThan(0);
        for (const id of productIdsOf(ingredient)) {
          expect(getCatalogProduct(id)).toBeDefined();
        }
      }
    },
  );

  it('las etiquetas vegetariana y vegana escritas a mano coinciden con el cálculo', () => {
    for (const r of recipes) {
      if (r.tags.includes('vegetariana')) {
        expect([r.id, isVegetarian(r)]).toEqual([r.id, true]);
      }
      if (r.tags.includes('vegana')) {
        expect([r.id, isVegan(r)]).toEqual([r.id, true]);
      }
    }
  });

  it('las recetas con pollo o cerdo recuerdan cocinarlo bien', () => {
    for (const r of recipes) {
      const usesPoultryOrPork = r.i.some(
        (i) =>
          !i.o &&
          productIdsOf(i).some((id) => ['pollo-trozos', 'pollo-entero', 'cerdo'].includes(id)),
      );
      if (usesPoultryOrPork) {
        expect([r.id, r.st.join(' ')]).toEqual([r.id, expect.stringMatching(/rosad/)]);
      }
    }
  });

  it('incluye recetas chilenas', () => {
    for (const id of [
      'cazuela-de-pollo',
      'charquican',
      'porotos-granados',
      'pastel-de-choclo',
      'sopaipillas',
    ]) {
      expect(getBaseRecipe(id)).toBeDefined();
    }
  });
});

describe('dieta y alérgenos', () => {
  it('calcula la dieta desde los ingredientes', () => {
    expect(isVegetarian(recipe('cazuela-de-pollo'))).toBe(false);
    expect(isVegetarian(recipe('tortilla-de-verduras'))).toBe(true);
    expect(isVegan(recipe('tortilla-de-verduras'))).toBe(false);
    expect(isVegan(recipe('ensalada-chilena'))).toBe(true);
    expect(fitsDiet(recipe('charquican'), 'vegetarian')).toBe(false);
    expect(fitsDiet(recipe('charquican'), 'none')).toBe(true);
  });

  it('calcula alérgenos sin contar opcionales', () => {
    expect(recipeAllergens(recipe('panqueques-con-manjar'))).toEqual([
      'gluten',
      'lactosa',
      'huevo',
    ]);
    expect(recipeAllergens(recipe('ensalada-chilena'))).toEqual([]);
    // El queso de la tortilla de verduras es opcional.
    expect(recipeAllergens(recipe('tortilla-de-verduras'))).toEqual(['huevo']);
    // "Salsa de soya" sin producto del catálogo cuenta como gluten.
    expect(recipeAllergens(recipe('salteado-de-verduras'))).toContain('gluten');
  });

  it('con alternativas sin lactosa no marca lactosa', () => {
    const r = { i: [{ p: ['leche-fresca', 'leche-sin-lactosa'], n: 'Leche', q: 1, u: 'l' }] };
    expect(recipeAllergens(r)).toEqual([]);
  });
});
