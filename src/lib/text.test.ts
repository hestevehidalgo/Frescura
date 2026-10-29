import { capitalize, normalizeForSearch, stripAccents } from './text';

describe('texto', () => {
  it('quita tildes', () => {
    expect(stripAccents('plátano jamón ñandú')).toBe('platano jamon nandu');
  });

  it('normaliza para buscar', () => {
    expect(normalizeForSearch('  Plátano   ORGÁNICO ')).toBe('platano organico');
  });

  it('pone mayúscula inicial', () => {
    expect(capitalize('ñoquis')).toBe('Ñoquis');
    expect(capitalize('')).toBe('');
  });
});
