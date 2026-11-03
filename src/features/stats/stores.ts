// Supermercados: nombres fijos para que "LIDER EXPRESS" y "Líder" cuenten como la misma tienda.
import { normalizeForSearch } from '@/lib/text';

/** Tiendas que se ofrecen al agregar a mano. */
export const STORES = [
  'Líder',
  'Jumbo',
  'Unimarc',
  'Santa Isabel',
  'Tottus',
  'aCuenta',
  'Feria',
  'Almacén',
] as const;

const ALIASES: [string, string][] = [
  ['lider', 'Líder'],
  ['jumbo', 'Jumbo'],
  ['unimarc', 'Unimarc'],
  ['santa isabel', 'Santa Isabel'],
  ['tottus', 'Tottus'],
  ['acuenta', 'aCuenta'],
  ['a cuenta', 'aCuenta'],
  ['mayorista 10', 'Mayorista 10'],
  ['alvi', 'Alvi'],
  ['oxxo', 'OXXO'],
  ['ok market', 'OK Market'],
  ['feria', 'Feria'],
];

/** "LIDER EXPRESS LAS CONDES" → "Líder". Si no se reconoce, se deja como venía. */
export function canonicalStore(name: string | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = normalizeForSearch(trimmed);
  for (const [alias, store] of ALIASES) {
    if (normalized.includes(alias)) {
      return store;
    }
  }
  return trimmed;
}
