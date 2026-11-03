// Estadísticas: todo se calcula en el celular, sin IA, desde los productos y sus eventos.
//
// - Plata botada: lo marcado como "Lo boté", proporcional a la cantidad.
// - Plata salvada: lo que te comiste cuando faltaban 3 días o menos para que venciera.
// - Aprovechado: de todo lo que se cerró (comido o botado), qué parte se comió.
// - Gasto: precio de lo comprado en el mes, por categoría y por supermercado.

import type { InventoryItem } from '@/db/inventory-repo';
import type { Product } from '@/features/catalog/catalog';
import { addDays, daysBetween, startOfWeek, todayLocal, type IsoDate } from '@/lib/dates';
import { normalizeForSearch } from '@/lib/text';

/** Producto con el supermercado donde se compró (si se sabe). */
export type StatsItem = InventoryItem & { store: string | null };

export type StatsEvent = {
  itemId: string;
  type: 'added' | 'consumed' | 'discarded' | 'split';
  quantityDelta: number;
  /** Momento del evento (ISO con hora). */
  at: string;
  /** Fecha de vencimiento que tenía el producto justo antes del evento. */
  expiresBefore: IsoDate | null;
  /** En una división: el lote nuevo que se creó. */
  splitChild: string | null;
};

export type StatsData = { items: StatsItem[]; events: StatsEvent[] };

/** "2026-11" */
export type Month = string;

/** Días antes del vencimiento en que comerse algo cuenta como "salvado". */
export const SAVED_WINDOW_DAYS = 3;
const TIP_WINDOW_DAYS = 60;
const MAX_TIPS = 3;

export function localDateOf(at: string): IsoDate {
  return todayLocal(new Date(at));
}

export function monthOf(date: IsoDate): Month {
  return date.slice(0, 7);
}

export function shiftMonth(month: Month, delta: number): Month {
  const [y, m] = month.split('-').map(Number);
  const index = (y ?? 0) * 12 + ((m ?? 1) - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

type ItemFacts = {
  item: StatsItem;
  /** Cantidad a la que corresponde el precio. */
  base: number;
  /** Precio por unidad del producto (en su unidad), o null si no tiene precio. */
  unitPrice: number | null;
  /** Lote creado al dividir otro: su precio ya está dentro del original. */
  splitChild: boolean;
};

function factsOf(data: StatsData): Map<string, ItemFacts> {
  const used = new Map<string, number>();
  const children = new Set<string>();
  for (const e of data.events) {
    if (e.type === 'consumed' || e.type === 'discarded' || e.type === 'split') {
      used.set(e.itemId, (used.get(e.itemId) ?? 0) - e.quantityDelta);
    }
    if (e.splitChild) {
      children.add(e.splitChild);
    }
  }
  const facts = new Map<string, ItemFacts>();
  for (const item of data.items) {
    const out = used.get(item.id) ?? 0;
    const open = item.status === 'active' || item.status === 'unknown';
    const base = (open ? item.quantity : 0) + out;
    facts.set(item.id, {
      item,
      base,
      unitPrice:
        item.priceClp !== null && item.priceClp > 0 && base > 0 ? item.priceClp / base : null,
      splitChild: children.has(item.id),
    });
  }
  return facts;
}

export type Share = { key: string; clp: number };

export type MonthlyStats = {
  month: Month;
  wastedClp: number;
  savedClp: number;
  consumedClp: number;
  /** Parte comida de lo que se cerró (0 a 1), o null si no se cerró nada. */
  usedShare: number | null;
  consumedCount: number;
  discardedCount: number;
  spentClp: number;
  boughtItems: number;
  pricedItems: number;
  spendingByCategory: Share[];
  spendingByStore: Share[];
  wastedByCategory: Share[];
};

function addTo(map: Map<string, number>, key: string, value: number): void {
  map.set(key, (map.get(key) ?? 0) + value);
}

function sorted(map: Map<string, number>): Share[] {
  return [...map]
    .map(([key, clp]) => ({ key, clp: Math.round(clp) }))
    .filter((s) => s.clp > 0)
    .sort((a, b) => b.clp - a.clp || a.key.localeCompare(b.key, 'es'));
}

/** Sin supermercado conocido (agregado a mano sin elegir tienda). */
export const UNKNOWN_STORE = '';

export function monthlyStats(
  data: StatsData,
  month: Month,
  categoryOf: (productId: string) => string,
): MonthlyStats {
  const facts = factsOf(data);
  let wasted = 0;
  let saved = 0;
  let consumed = 0;
  let consumedShare = 0;
  let discardedShare = 0;
  let consumedCount = 0;
  let discardedCount = 0;
  const wastedByCategory = new Map<string, number>();

  for (const e of data.events) {
    if (e.type !== 'consumed' && e.type !== 'discarded') {
      continue;
    }
    const date = localDateOf(e.at);
    const f = facts.get(e.itemId);
    if (monthOf(date) !== month || !f || f.base <= 0) {
      continue;
    }
    const amount = -e.quantityDelta;
    const value = (f.unitPrice ?? 0) * amount;
    const fraction = amount / f.base;
    if (e.type === 'consumed') {
      consumed += value;
      consumedShare += fraction;
      consumedCount += 1;
      const daysLeft = e.expiresBefore ? daysBetween(date, e.expiresBefore) : -1;
      if (daysLeft >= 0 && daysLeft <= SAVED_WINDOW_DAYS) {
        saved += value;
      }
    } else {
      wasted += value;
      discardedShare += fraction;
      discardedCount += 1;
      addTo(wastedByCategory, categoryOf(f.item.productId), value);
    }
  }

  let spent = 0;
  let bought = 0;
  let priced = 0;
  const byCategory = new Map<string, number>();
  const byStore = new Map<string, number>();
  for (const f of facts.values()) {
    if (f.splitChild || monthOf(f.item.purchasedAt) !== month) {
      continue;
    }
    bought += 1;
    const price = f.item.priceClp;
    if (price === null || price <= 0) {
      continue;
    }
    priced += 1;
    spent += price;
    addTo(byCategory, categoryOf(f.item.productId), price);
    addTo(byStore, f.item.store?.trim() || UNKNOWN_STORE, price);
  }

  const closed = consumedShare + discardedShare;
  return {
    month,
    wastedClp: Math.round(wasted),
    savedClp: Math.round(saved),
    consumedClp: Math.round(consumed),
    usedShare: closed > 0 ? consumedShare / closed : null,
    consumedCount,
    discardedCount,
    spentClp: spent,
    boughtItems: bought,
    pricedItems: priced,
    spendingByCategory: sorted(byCategory),
    spendingByStore: sorted(byStore),
    wastedByCategory: sorted(wastedByCategory),
  };
}

/**
 * Semanas completas seguidas (de lunes a domingo) sin botar comida, contando hacia atrás desde
 * la semana pasada. Si esta semana ya se botó algo, la racha es 0.
 */
export function weeklyStreak(data: StatsData, today: IsoDate): number {
  const added = data.events.filter((e) => e.type === 'added').map((e) => localDateOf(e.at));
  if (added.length === 0) {
    return 0;
  }
  const first = startOfWeek(added.reduce((a, b) => (a <= b ? a : b)));
  const discardWeeks = new Set(
    data.events.filter((e) => e.type === 'discarded').map((e) => startOfWeek(localDateOf(e.at))),
  );
  let week = startOfWeek(today);
  if (discardWeeks.has(week)) {
    return 0;
  }
  let streak = 0;
  week = addDays(week, -7);
  while (week >= first && !discardWeeks.has(week)) {
    streak += 1;
    week = addDays(week, -7);
  }
  return streak;
}

export type TipKey =
  'freezePart' | 'buyLess' | 'topWaste' | 'markItems' | 'addPrices' | 'goodMonth';

export type Tip = { key: TipKey; params: Record<string, string | number> };

export type TipProduct = { name: string; canFreeze: boolean };

// Categorías donde congelar una parte al llegar es buen consejo. Frutas y verduras crudas no:
// se recomienda comprar menos.
const FREEZE_FRIENDLY = new Set([
  'panaderia',
  'carnes',
  'aves',
  'pescados',
  'quesos',
  'preparados',
]);

export function tipProductOf(product: Product): TipProduct {
  return {
    name: product.name,
    canFreeze: product.freezer !== undefined && FREEZE_FRIENDLY.has(product.categoryId),
  };
}

/** Consejos con reglas simples (sin IA). Como máximo 3, de lo más útil a lo menos. */
export function buildTips(
  data: StatsData,
  today: IsoDate,
  monthly: MonthlyStats,
  productOf: (productId: string) => TipProduct | undefined,
  categoryName: (categoryId: string) => string,
): Tip[] {
  const facts = factsOf(data);
  const since = addDays(today, -TIP_WINDOW_DAYS);
  const perProduct = new Map<string, { eaten: number; thrown: number; discards: number }>();
  for (const e of data.events) {
    const f = facts.get(e.itemId);
    if ((e.type !== 'consumed' && e.type !== 'discarded') || !f || f.base <= 0) {
      continue;
    }
    if (localDateOf(e.at) < since) {
      continue;
    }
    const entry = perProduct.get(f.item.productId) ?? { eaten: 0, thrown: 0, discards: 0 };
    const fraction = -e.quantityDelta / f.base;
    if (e.type === 'consumed') {
      entry.eaten += fraction;
    } else {
      entry.thrown += fraction;
      entry.discards += 1;
    }
    perProduct.set(f.item.productId, entry);
  }

  const tips: Tip[] = [];
  const wasteful = [...perProduct]
    .map(([productId, x]) => ({ productId, ...x, share: x.thrown / (x.eaten + x.thrown) }))
    .filter((x) => x.discards >= 2 && x.share >= 1 / 3)
    .sort((a, b) => b.share - a.share || b.discards - a.discards);
  for (const x of wasteful.slice(0, 2)) {
    const product = productOf(x.productId);
    if (product) {
      tips.push({
        key: product.canFreeze ? 'freezePart' : 'buyLess',
        params: { name: product.name, pct: Math.round(x.share * 100) },
      });
    }
  }

  const top = monthly.wastedByCategory[0];
  if (top) {
    tips.push({ key: 'topWaste', params: { category: categoryName(top.key), amount: top.clp } });
  }

  const unanswered = data.items.filter(
    (i) => i.status === 'unknown' && i.closedAt !== null && localDateOf(i.closedAt) >= since,
  ).length;
  if (unanswered >= 3) {
    tips.push({ key: 'markItems', params: { n: unanswered } });
  }

  if (monthly.boughtItems >= 5 && monthly.pricedItems / monthly.boughtItems < 0.5) {
    tips.push({ key: 'addPrices', params: {} });
  }

  if (
    monthly.usedShare !== null &&
    monthly.usedShare >= 0.9 &&
    monthly.consumedCount + monthly.discardedCount >= 5
  ) {
    tips.push({ key: 'goodMonth', params: { pct: Math.round(monthly.usedShare * 100) } });
  }

  return tips.slice(0, MAX_TIPS);
}

// ---------------------------------------------------------------------------------------------
// Precios

export type PriceUnit = 'kg' | 'l' | 'un';

export type PricePoint = {
  itemId: string;
  date: IsoDate;
  store: string | null;
  /** Precio por kilo, por litro o por unidad, en pesos enteros. */
  perUnitClp: number;
  unit: PriceUnit;
};

/** Precios pagados por producto, del más reciente al más antiguo. */
export function priceHistory(data: StatsData): Map<string, PricePoint[]> {
  const result = new Map<string, PricePoint[]>();
  for (const f of factsOf(data).values()) {
    const { item } = f;
    if (f.splitChild || item.priceClp === null || item.priceClp <= 0 || f.base <= 0) {
      continue;
    }
    let quantity = f.base;
    let unit: PriceUnit = 'un';
    if (item.unit === 'kg' || item.unit === 'l') {
      unit = item.unit;
    } else if (item.unit === 'g' || item.unit === 'ml') {
      quantity = f.base / 1000;
      unit = item.unit === 'g' ? 'kg' : 'l';
    }
    const points = result.get(item.productId) ?? [];
    points.push({
      itemId: item.id,
      date: item.purchasedAt,
      store: item.store?.trim() || null,
      perUnitClp: Math.round(item.priceClp / quantity),
      unit,
    });
    result.set(item.productId, points);
  }
  for (const points of result.values()) {
    points.sort((a, b) => b.date.localeCompare(a.date) || b.itemId.localeCompare(a.itemId));
  }
  return result;
}

export type PriceComparison = {
  productId: string;
  unit: PriceUnit;
  /** Último precio en cada supermercado, del más barato al más caro. */
  stores: { store: string; perUnitClp: number; date: IsoDate }[];
  /** Cuánto más barato es el primero que el último, en %. */
  savingPct: number;
};

/** Productos que compraste en dos o más supermercados, con el último precio de cada uno. */
export function priceComparisons(history: Map<string, PricePoint[]>): PriceComparison[] {
  const result: PriceComparison[] = [];
  for (const [productId, points] of history) {
    const byUnit = new Map<PriceUnit, Map<string, PricePoint>>();
    for (const point of points) {
      if (!point.store) {
        continue;
      }
      const stores = byUnit.get(point.unit) ?? new Map<string, PricePoint>();
      const key = normalizeForSearch(point.store);
      // Los puntos vienen del más reciente al más antiguo: se queda el primero.
      if (!stores.has(key)) {
        stores.set(key, point);
      }
      byUnit.set(point.unit, stores);
    }
    for (const [unit, stores] of byUnit) {
      if (stores.size < 2) {
        continue;
      }
      const list = [...stores.values()]
        .map((p) => ({ store: p.store ?? '', perUnitClp: p.perUnitClp, date: p.date }))
        .sort((a, b) => a.perUnitClp - b.perUnitClp);
      const cheapest = list[0]?.perUnitClp ?? 0;
      const priciest = list[list.length - 1]?.perUnitClp ?? 0;
      result.push({
        productId,
        unit,
        stores: list,
        savingPct: priciest > 0 ? Math.round(((priciest - cheapest) / priciest) * 100) : 0,
      });
    }
  }
  return result.sort((a, b) => b.savingPct - a.savingPct);
}
