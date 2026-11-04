import { toastDuration } from './undo-toast';

jest.mock('react-native-reanimated', () => ({}));

it('los mensajes largos quedan más tiempo en pantalla', () => {
  expect(toastDuration('Congelaste Pan')).toBe(5000);
  expect(toastDuration('x'.repeat(150))).toBe(10_000);
  expect(toastDuration('x'.repeat(1000))).toBe(12_000);
});
