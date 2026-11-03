import { parseSpokenList, splitSpokenList } from './spoken-list';

const defaultQuantity = () => 1;
const simplify = (text: string) =>
  parseSpokenList(text, defaultQuantity).entries.map((e) => [e.product.id, e.quantity]);

it('splitSpokenList separa por comas e "y"', () => {
  expect(splitSpokenList('dos tomates, un kilo de papas y leche')).toEqual([
    'dos tomates',
    'un kilo de papas',
    'leche',
  ]);
});

it('entiende números escritos y dichos, con unidades', () => {
  expect(simplify('dos tomates, un kilo de papas y 500 g de carne molida')).toEqual([
    ['tomate', 2],
    ['papa', 1],
    ['carne-molida', 0.5],
  ]);
  expect(simplify('media docena de huevos\n3 paltas')).toEqual([
    ['huevos', 6],
    ['palta', 3],
  ]);
  expect(simplify('una docena de huevos')).toEqual([['huevos', 12]]);
});

it('usa la cantidad por defecto si la unidad no calza', () => {
  expect(simplify('3 papas')).toEqual([['papa', 1]]);
  expect(simplify('lechuga')).toEqual([['lechuga', 1]]);
});

it('devuelve lo que no reconoce', () => {
  expect(parseSpokenList('2 tomates y una nave espacial', defaultQuantity).unknown).toEqual([
    'una nave espacial',
  ]);
});
