import {
  cacheKey,
  parseAiRecipe,
  SYSTEM_PROMPT,
  validateRecipeRequest,
  type RecipeRequest,
} from './logic';

const REQUEST: RecipeRequest = {
  ingredients: ['zapallo italiano', 'huevos', 'queso'],
  diet: 'none',
  avoid: [],
  equipment: ['sarten', 'olla'],
  servings: 2,
};

describe('validateRecipeRequest', () => {
  it('limpia y limita la entrada', () => {
    const result = validateRecipeRequest({
      ingredients: ['Zapallo Italiano', 'zapallo italiano', 'HUEVOS', '<script>', 'x', 'queso'],
      diet: 'vegetarian',
      avoid: ['gluten', 'veneno'],
      equipment: ['sarten', 'nave-espacial'],
      servings: 20,
    });
    expect(result).toEqual({
      ingredients: ['zapallo italiano', 'huevos', 'script', 'queso'],
      diet: 'vegetarian',
      avoid: ['gluten'],
      equipment: ['sarten'],
      servings: 2,
    });
  });

  it('pide al menos dos ingredientes', () => {
    expect(validateRecipeRequest({ ingredients: ['palta'] })).toEqual({
      error: 'not_enough_ingredients',
    });
    expect(validateRecipeRequest(null)).toEqual({ error: 'invalid_body' });
  });
});

describe('cacheKey', () => {
  it('no depende del orden', () => {
    expect(cacheKey(REQUEST)).toBe(
      cacheKey({
        ...REQUEST,
        ingredients: ['queso', 'huevos', 'zapallo italiano'],
        equipment: ['olla', 'sarten'],
      }),
    );
    expect(cacheKey(REQUEST)).not.toBe(cacheKey({ ...REQUEST, diet: 'vegan' }));
  });
});

describe('parseAiRecipe', () => {
  const good = {
    t: 'Tortilla de zapallo italiano',
    s: 2,
    m: 20,
    d: 1,
    tags: ['chilena'],
    e: ['sarten'],
    i: [
      { n: 'Zapallo italiano', q: 2, u: 'un' },
      { n: 'Huevos', q: 4, u: 'docenas' },
    ],
    st: ['Ralla el zapallo.', 'Bate los huevos y cocina en sartén.'],
  };

  it('acepta una receta válida y normaliza unidades', () => {
    expect(parseAiRecipe(good, REQUEST)).toMatchObject({
      t: 'Tortilla de zapallo italiano',
      i: [
        { n: 'zapallo italiano', q: 2, u: 'un' },
        { n: 'huevos', q: 4, u: 'un' },
      ],
    });
  });

  it('rechaza recetas que piden equipamiento que no hay', () => {
    expect(parseAiRecipe({ ...good, e: ['horno'] }, REQUEST)).toBeNull();
  });

  it('rechaza recetas incompletas', () => {
    expect(parseAiRecipe({ ...good, st: ['x'] }, REQUEST)).toBeNull();
    expect(parseAiRecipe({ ...good, t: '' }, REQUEST)).toBeNull();
    expect(parseAiRecipe('hola', REQUEST)).toBeNull();
  });
});

it('el prompt exige seguridad alimentaria y respetar alergias', () => {
  expect(SYSTEM_PROMPT).toMatch(/rosados/);
  expect(SYSTEM_PROMPT).toMatch(/alérgenos a evitar/);
  expect(SYSTEM_PROMPT).toMatch(/conservas/);
  expect(SYSTEM_PROMPT.length).toBeGreaterThan(2500);
});
