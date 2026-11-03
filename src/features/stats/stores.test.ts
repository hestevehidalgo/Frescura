import { canonicalStore } from './stores';

it('canonicalStore une variantes del mismo supermercado', () => {
  expect(canonicalStore('LIDER EXPRESS LAS CONDES')).toBe('Líder');
  expect(canonicalStore('Hiper Líder')).toBe('Líder');
  expect(canonicalStore('SUPERMERCADOS SANTA ISABEL')).toBe('Santa Isabel');
  expect(canonicalStore('Almacén Don Pepe')).toBe('Almacén Don Pepe');
  expect(canonicalStore('  ')).toBeNull();
  expect(canonicalStore(null)).toBeNull();
});
