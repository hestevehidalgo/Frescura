import { targetWidth } from './capture';

jest.mock('expo-image-manipulator', () => ({}));
jest.mock('expo-image-picker', () => ({}));

it('la foto se achica pero nunca se agranda', () => {
  expect(targetWidth(3024)).toBe(1100);
  expect(targetWidth(1100)).toBeNull();
  expect(targetWidth(800)).toBeNull();
  expect(targetWidth(undefined)).toBeNull();
});

it('la foto de un producto se achica a 512 px', () => {
  expect(targetWidth(3024, 512)).toBe(512);
  expect(targetWidth(400, 512)).toBeNull();
});
