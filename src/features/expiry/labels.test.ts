import { relativeExpiryLabel } from './labels';

describe('relativeExpiryLabel', () => {
  const today = '2026-11-10';
  it.each([
    ['2026-11-07', 'Venció hace 3 días'],
    ['2026-11-09', 'Venció ayer'],
    ['2026-11-10', 'Vence hoy'],
    ['2026-11-11', 'Mañana'],
    ['2026-11-13', 'En 3 días'],
    ['2026-11-17', '17 nov'],
  ])('%s → %s', (date, label) => {
    expect(relativeExpiryLabel(date, today)).toBe(label);
  });
});
