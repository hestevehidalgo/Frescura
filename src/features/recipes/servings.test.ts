import { clampServings, scaleAmount } from './servings';

it('escala con redondeos de cocina', () => {
  // 3 huevos para 2 → para 3 son 4,5 huevos.
  expect(scaleAmount(3, 'un', 1.5)).toBe(4.5);
  // 1 huevo para 4 → para 1 es medio huevo (nunca 0).
  expect(scaleAmount(1, 'un', 0.25)).toBe(0.5);
  expect(scaleAmount(250, 'g', 1.5)).toBe(380);
  expect(scaleAmount(30, 'g', 1.5)).toBe(45);
  expect(scaleAmount(1, 'cda', 1.5)).toBe(1.5);
  expect(scaleAmount(1, 'cdta', 0.5)).toBe(0.5);
  expect(scaleAmount(0.5, 'kg', 3)).toBe(1.5);
});

it('las porciones van de 1 a 12', () => {
  expect(clampServings(0)).toBe(1);
  expect(clampServings(20)).toBe(12);
  expect(clampServings(3.4)).toBe(3);
});
