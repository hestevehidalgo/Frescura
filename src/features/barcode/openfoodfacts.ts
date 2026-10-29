// Cliente mínimo de Open Food Facts (base abierta y gratuita, licencia ODbL).
// Política de uso: identificar la app en el User-Agent y no pasar de 15 consultas de producto por
// minuto. Cada resultado se guarda en el celular para no volver a consultarlo.

import { APP_CONFIG } from '@/config/app';
import { searchCatalog, type Product } from '@/features/catalog/catalog';
import { normalizeForSearch } from '@/lib/text';

const API = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = 'product_name,product_name_es,generic_name_es,brands,categories_tags';
const USER_AGENT = `${APP_CONFIG.name}/0.1 (https://github.com/hestevehidalgo/Frescura)`;
/** 15 por minuto como máximo: una consulta cada 4 segundos deja margen. */
const MIN_INTERVAL_MS = 4000;
const TIMEOUT_MS = 8000;

export type OffProduct = { name: string; brand: string | null; categoryId: string | null };
export type OffResult =
  | { status: 'found'; product: OffProduct }
  | { status: 'not_found' }
  | { status: 'offline' }
  | { status: 'rate_limited' };

type FetchLike = (
  url: string,
  init: { headers: Record<string, string>; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

let lastRequestAt = 0;

/** Solo para tests. */
export function resetRateLimit(): void {
  lastRequestAt = 0;
}

// Etiquetas de categoría de Open Food Facts → categorías de Frescura. La primera que calce gana.
const CATEGORY_TAGS: [string, string][] = [
  ['en:yogurts', 'lacteos'],
  ['en:milks', 'lacteos'],
  ['en:creams', 'lacteos'],
  ['en:butters', 'lacteos'],
  ['en:cheeses', 'quesos'],
  ['en:eggs', 'huevos'],
  ['en:sausages', 'embutidos'],
  ['en:hams', 'embutidos'],
  ['en:prepared-meats', 'embutidos'],
  ['en:poultries', 'aves'],
  ['en:chickens', 'aves'],
  ['en:seafood', 'pescados'],
  ['en:fishes', 'pescados'],
  ['en:meats', 'carnes'],
  ['en:frozen-foods', 'congelados'],
  ['en:breads', 'panaderia'],
  ['en:cakes', 'panaderia'],
  ['en:canned-foods', 'conservas'],
  ['en:juices', 'bebidas'],
  ['en:beverages', 'bebidas'],
  ['en:sauces', 'salsas'],
  ['en:condiments', 'salsas'],
  ['en:spreads', 'salsas'],
  ['en:biscuits', 'snacks'],
  ['en:chocolates', 'snacks'],
  ['en:snacks', 'snacks'],
  ['en:pastas', 'abarrotes'],
  ['en:rices', 'abarrotes'],
  ['en:cereals-and-potatoes', 'abarrotes'],
  ['en:breakfast-cereals', 'abarrotes'],
  ['en:legumes', 'abarrotes'],
  ['en:flours', 'abarrotes'],
  ['en:sugars', 'abarrotes'],
  ['en:vegetable-oils', 'abarrotes'],
  ['en:fruits', 'frutas'],
  ['en:vegetables', 'verduras'],
  ['en:dairies', 'lacteos'],
];

export function categoryFromTags(tags: string[]): string | null {
  for (const [tag, category] of CATEGORY_TAGS) {
    if (tags.includes(tag)) {
      return category;
    }
  }
  return null;
}

/**
 * Producto del catálogo que corresponde al nombre de Open Food Facts, si el nombre empieza con él
 * ("Leche entera Colún 1L" → leche larga vida). Así se usa la vida útil específica y no la genérica.
 */
export function matchCatalog(name: string): Product | null {
  const normalized = normalizeForSearch(name);
  const words = normalized.split(' ');
  for (let length = Math.min(3, words.length); length >= 1; length--) {
    const prefix = words.slice(0, length).join(' ');
    const match = searchCatalog(prefix, 3).find((p) =>
      [p.name, ...p.aliases].map(normalizeForSearch).some((n) => n === prefix),
    );
    if (match) {
      return match;
    }
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function lookupBarcode(
  ean: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  now = Date.now(),
): Promise<OffResult> {
  if (!/^\d{8,14}$/.test(ean)) {
    return { status: 'not_found' };
  }
  if (now - lastRequestAt < MIN_INTERVAL_MS) {
    return { status: 'rate_limited' };
  }
  lastRequestAt = now;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timeout = setTimeout(() => controller?.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${API}/${ean}.json?fields=${FIELDS}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller?.signal,
    });
    if (response.status === 404) {
      return { status: 'not_found' };
    }
    if (response.status === 429) {
      return { status: 'rate_limited' };
    }
    if (!response.ok) {
      return { status: 'offline' };
    }
    const body = (await response.json()) as { status?: number; product?: Record<string, unknown> };
    const p = body.product;
    const name =
      p && (asString(p.product_name_es) ?? asString(p.product_name) ?? asString(p.generic_name_es));
    if (body.status !== 1 || !p || !name) {
      return { status: 'not_found' };
    }
    const tags = Array.isArray(p.categories_tags)
      ? p.categories_tags.filter((t): t is string => typeof t === 'string')
      : [];
    return {
      status: 'found',
      product: {
        name,
        brand: asString(p.brands)?.split(',')[0]?.trim() ?? null,
        categoryId: categoryFromTags(tags),
      },
    };
  } catch {
    return { status: 'offline' };
  } finally {
    clearTimeout(timeout);
  }
}
