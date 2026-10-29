// Motor de vencimientos: todo sale de la tabla local, nunca de la IA.
// Para avisar se usa el mínimo de cada rango; el máximo solo se muestra.

import type { DayRange, Location, Product } from '@/features/catalog/catalog';
import { addDays, daysBetween, maxDate, minDate, type IsoDate } from '@/lib/dates';

export type ExpirySource = 'printed' | 'estimated' | 'user';

export type Expiry = {
  expiresAt: IsoDate;
  source: ExpirySource;
  /** Rango estimado para mostrar ("entre el 12 y el 15 nov"); null si la fecha es real o del usuario. */
  latestAt: IsoDate | null;
};

/** Productos donde la app siempre usa el criterio más conservador. */
export function isHighRisk(product: Product): boolean {
  return product.risk === 'high' || product.cooked;
}

/** La vida útil de estos productos nunca se alarga automáticamente. */
export function canExtendShelfLife(product: Product): boolean {
  return !isHighRisk(product) && !product.freshStrict && product.risk === 'low';
}

/** Rango de vida útil cerrado para un lugar, con alternativas razonables si falta. */
export function closedRange(product: Product, location: Location): DayRange {
  const direct = product[location];
  if (direct) {
    return direct;
  }
  if (location === 'fridge') {
    // Lo que dura en la despensa dura al menos eso en el refri.
    return product.pantry ?? product.fridgeOpened ?? [3, 5];
  }
  if (location === 'pantry') {
    // Si algo debería ir al refri y se deja afuera, se usa un rango mucho más corto.
    return isHighRisk(product) ? [0, 0] : [1, 2];
  }
  return [60, 90];
}

export function openedRange(product: Product, location: Location): DayRange | undefined {
  if (location === 'pantry') {
    return product.pantryOpened;
  }
  return product.fridgeOpened ?? product.pantryOpened;
}

/** Dónde conviene guardar un producto después de abrirlo. */
export function locationAfterOpening(product: Product, current: Location): Location {
  if (current === 'pantry' && !product.pantryOpened && product.fridgeOpened) {
    return 'fridge';
  }
  return current;
}

function applyFactor(days: number, product: Product, factor: number): number {
  const safe = canExtendShelfLife(product) ? factor : Math.min(factor, 1);
  return Math.max(0, Math.floor(days * safe));
}

export type EstimateInput = {
  product: Product;
  location: Location;
  purchasedAt: IsoDate;
  /** Respuesta a "¿Estaba madura?" (solo productos variables). */
  ripe?: boolean;
  /** Ajuste personal (0,5 a 1,5). */
  factor?: number;
};

/** Vencimiento estimado al agregar un producto: fecha de compra + días mínimos. */
export function estimateExpiry({
  product,
  location,
  purchasedAt,
  ripe,
  factor = 1,
}: EstimateInput): Expiry {
  let range = closedRange(product, location);
  if (ripe && product.ripeness && product.ripeness.storage === location) {
    range = product.ripeness.range;
  } else if (ripe && product.ripeness) {
    // Madura y guardada en otro lugar: se usa el más corto de los dos.
    range = [
      Math.min(range[0], product.ripeness.range[0]),
      Math.min(range[1], product.ripeness.range[1]),
    ];
  }
  return {
    expiresAt: addDays(purchasedAt, applyFactor(range[0], product, factor)),
    source: 'estimated',
    latestAt: addDays(purchasedAt, applyFactor(range[1], product, factor)),
  };
}

/** "Lo abrí": gana la fecha más temprana entre la que tenía y la de abierto. */
export function expiryAfterOpening(
  product: Product,
  current: Expiry,
  location: Location,
  openedAt: IsoDate,
): Expiry {
  const range = openedRange(product, locationAfterOpening(product, location));
  if (!range) {
    return current;
  }
  const opened = addDays(openedAt, range[0]);
  if (opened >= current.expiresAt) {
    return current;
  }
  return { expiresAt: opened, source: 'estimated', latestAt: addDays(openedAt, range[1]) };
}

/** "Lo congelé": la cuenta parte de nuevo con la vida útil de congelador. */
export function expiryAfterFreezing(product: Product, frozenAt: IsoDate): Expiry {
  const range = closedRange(product, 'freezer');
  return {
    expiresAt: addDays(frozenAt, range[0]),
    source: 'estimated',
    latestAt: addDays(frozenAt, range[1]),
  };
}

/** "Lo descongelé": vida útil corta en el refri. No se debe volver a congelar. */
export function expiryAfterThawing(product: Product, thawedAt: IsoDate): Expiry {
  return {
    expiresAt: addDays(thawedAt, product.thawed[0]),
    source: 'estimated',
    latestAt: addDays(thawedAt, product.thawed[1]),
  };
}

/**
 * Cambio de lugar de algo cerrado con fecha estimada (por ejemplo, la palta que maduró y pasa al
 * refri). Se recalcula desde hoy con el nuevo lugar, sin pasar el máximo desde la compra.
 * Las fechas reales o puestas por el usuario no cambian.
 */
export function expiryAfterMoving(
  product: Product,
  current: Expiry,
  to: Location,
  purchasedAt: IsoDate,
  today: IsoDate,
): Expiry {
  if (current.source !== 'estimated') {
    return current;
  }
  const range = closedRange(product, to);
  const cap = addDays(purchasedAt, range[1]);
  const expiresAt = maxDate(today, minDate(addDays(today, range[0]), cap));
  return { expiresAt, source: 'estimated', latestAt: maxDate(expiresAt, cap) };
}

/** La fecha impresa en el envase siempre reemplaza a la estimada. */
export function printedExpiry(date: IsoDate): Expiry {
  return { expiresAt: date, source: 'printed', latestAt: null };
}

export function userExpiry(date: IsoDate): Expiry {
  return { expiresAt: date, source: 'user', latestAt: null };
}

// ---------- Urgencia ----------

export const URGENCIES = ['expired', 'today', 'soon', 'week', 'later'] as const;
export type Urgency = (typeof URGENCIES)[number];

export function urgencyOf(expiresAt: IsoDate, today: IsoDate): Urgency {
  const days = daysBetween(today, expiresAt);
  if (days < 0) {
    return 'expired';
  }
  if (days === 0) {
    return 'today';
  }
  if (days <= 3) {
    return 'soon';
  }
  if (days <= 7) {
    return 'week';
  }
  return 'later';
}

// ---------- Aprendizaje personal ----------

export const MIN_FACTOR = 0.5;
export const MAX_FACTOR = 1.5;

/** "Se echó a perder antes": acorta la vida útil de ese producto para este usuario. */
export function factorAfterSpoiledEarly(current: number): number {
  return Math.max(MIN_FACTOR, Math.round(current * 0.8 * 100) / 100);
}

/**
 * Se consumió en buen estado después de la fecha estimada: se alarga con más cautela, y solo en
 * productos de bajo riesgo. Nunca carnes, pescados, mariscos, lácteos frescos ni comida cocinada.
 */
export function factorAfterLastedLonger(product: Product, current: number): number {
  if (!canExtendShelfLife(product)) {
    return Math.min(current, 1);
  }
  return Math.min(MAX_FACTOR, Math.round(current * 1.1 * 100) / 100);
}
