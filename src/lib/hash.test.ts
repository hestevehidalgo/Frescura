import { fingerprint } from './hash';

describe('fingerprint', () => {
  it('es estable y distingue textos distintos', () => {
    expect(fingerprint('boleta')).toBe(fingerprint('boleta'));
    expect(fingerprint('boleta')).not.toBe(fingerprint('boleta2'));
    expect(fingerprint('')).toBe('811c9dc5-0');
  });
});
