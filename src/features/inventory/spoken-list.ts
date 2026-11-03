// "Agregar una lista": la persona escribe o dicta (con el micrófono del teclado) algo como
// "dos tomates, un kilo de papas y leche" y se convierte en productos del catálogo.
// No usa IA ni internet: el dictado lo hace el teclado del celular.

import { getCatalogProduct, type Product } from '@/features/catalog/catalog';
import { catalogIdFor, parseIngredientLine } from '@/features/recipes/user-recipe';
import { normalizeForSearch } from '@/lib/text';

const NUMBER_WORDS: Record<string, string> = {
  un: '1',
  una: '1',
  uno: '1',
  dos: '2',
  tres: '3',
  cuatro: '4',
  cinco: '5',
  seis: '6',
  siete: '7',
  ocho: '8',
  nueve: '9',
  diez: '10',
  once: '11',
  doce: '12',
  medio: '0,5',
  media: '0,5',
};

export type SpokenEntry = { product: Product; quantity: number };

export type SpokenResult = { entries: SpokenEntry[]; unknown: string[] };

/** Separa por comas, puntos, saltos de línea y la palabra "y". */
export function splitSpokenList(text: string): string[] {
  return text
    .split(/[,;.\n]+|\s+y\s+|\s+e\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** "dos tomates" → "2 tomates"; "media docena de huevos" → "6 huevos"; "un kilo de papas" → "1 kilo de papas". */
function normalizeAmounts(part: string): string {
  const words = part.split(/\s+/);
  const first = NUMBER_WORDS[normalizeForSearch(words[0] ?? '')];
  if (first) {
    words[0] = first;
  }
  if (normalizeForSearch(words[1] ?? '').startsWith('docena')) {
    const count = Math.round(Number((words[0] ?? '1').replace(',', '.')) * 12);
    words.splice(0, 2, String(count));
    if (normalizeForSearch(words[1] ?? '') === 'de') {
      words.splice(1, 1);
    }
  } else if (/^docena/.test(normalizeForSearch(words[0] ?? ''))) {
    words.splice(0, 1, '12');
    if (normalizeForSearch(words[1] ?? '') === 'de') {
      words.splice(1, 1);
    }
  }
  return words.join(' ');
}

const TO_BASE: Record<string, { unit: 'kg' | 'l'; factor: number }> = {
  g: { unit: 'kg', factor: 0.001 },
  kg: { unit: 'kg', factor: 1 },
  ml: { unit: 'l', factor: 0.001 },
  l: { unit: 'l', factor: 1 },
};

/** Convierte la cantidad dicha a la unidad del producto, si se puede. */
function quantityFor(product: Product, q: number, u: string, explicit: boolean): number | null {
  if (u === 'un' || !TO_BASE[u]) {
    // "2 paltas": unidades. "3 papas" (que se venden por kilo): no se puede convertir.
    return product.unit === 'un' && explicit ? q : null;
  }
  const from = TO_BASE[u];
  const to = TO_BASE[product.unit];
  if (!from || !to || from.unit !== to.unit) {
    return null;
  }
  return Math.round(((q * from.factor) / to.factor) * 1000) / 1000;
}

export function parseSpokenList(
  text: string,
  defaultQuantity: (p: Product) => number,
): SpokenResult {
  const entries: SpokenEntry[] = [];
  const unknown: string[] = [];
  for (const part of splitSpokenList(text)) {
    const normalized = normalizeAmounts(part);
    const line = parseIngredientLine(normalized);
    if (!line) {
      continue;
    }
    const id = typeof line.p === 'string' ? line.p : catalogIdFor(line.n);
    const product = id ? getCatalogProduct(id) : undefined;
    if (!product) {
      unknown.push(part);
      continue;
    }
    const explicit = /^\d/.test(normalized);
    const quantity = quantityFor(product, line.q, line.u, explicit) ?? defaultQuantity(product);
    entries.push({ product, quantity: quantity > 0 ? quantity : defaultQuantity(product) });
  }
  return { entries, unknown };
}
