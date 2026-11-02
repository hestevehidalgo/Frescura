import { buildUserRecipe, catalogIdFor, parseIngredientLine } from './user-recipe';

describe('parseIngredientLine', () => {
  it('entiende cantidad, unidad y producto', () => {
    expect(parseIngredientLine('500 g carne molida')).toEqual({
      p: 'carne-molida',
      n: 'carne molida',
      q: 500,
      u: 'g',
    });
    expect(parseIngredientLine('1,5 kilos de papas')).toEqual({
      p: 'papa',
      n: 'papas',
      q: 1.5,
      u: 'kg',
    });
    expect(parseIngredientLine('1/2 taza de arroz')).toEqual({
      p: 'arroz',
      n: 'arroz',
      q: 0.5,
      u: 'taza',
    });
  });

  it('sin unidad cuenta unidades, y sin número es 1', () => {
    expect(parseIngredientLine('2 cebollas')).toEqual({
      p: 'cebolla',
      n: 'cebollas',
      q: 2,
      u: 'un',
    });
    expect(parseIngredientLine('Sal a gusto')).toEqual({
      p: 'sal',
      n: 'Sal a gusto',
      q: 1,
      u: 'un',
    });
  });

  it('ignora líneas vacías', () => {
    expect(parseIngredientLine('   ')).toBeNull();
    expect(parseIngredientLine('3')).toBeNull();
  });
});

it('catalogIdFor prueba el singular', () => {
  expect(catalogIdFor('tomates')).toBe('tomate');
  expect(catalogIdFor('zapallo italiano')).toBe('zapallo-italiano');
  expect(catalogIdFor('nave espacial')).toBeNull();
});

describe('buildUserRecipe', () => {
  it('arma la receta desde el formulario', () => {
    const recipe = buildUserRecipe(
      {
        title: ' Tallarines de la abuela ',
        servings: 4,
        ingredientsText: '400 g fideos\n\n2 tomates\n',
        stepsText: 'Cuece los fideos.\n\nHaz la salsa.',
      },
      'user-1',
    );
    expect(recipe).toMatchObject({
      id: 'user-1',
      t: 'Tallarines de la abuela',
      s: 4,
      source: 'user',
      st: ['Cuece los fideos.', 'Haz la salsa.'],
    });
    expect(recipe?.i.map((i) => i.p)).toEqual(['fideos', 'tomate']);
  });

  it('pide nombre, ingredientes y pasos', () => {
    const draft = { title: 'X', servings: 2, ingredientsText: '1 palta', stepsText: 'Come.' };
    expect(buildUserRecipe({ ...draft, title: ' ' }, 'a')).toBeNull();
    expect(buildUserRecipe({ ...draft, ingredientsText: '' }, 'a')).toBeNull();
    expect(buildUserRecipe({ ...draft, stepsText: '\n' }, 'a')).toBeNull();
  });
});
