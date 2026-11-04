// Pesos chilenos: enteros, sin decimales, con punto como separador de miles.
// "1.290" son mil doscientos noventa pesos, nunca 1,29.

export type Clp = number;

/** 1290 → "$1.290"; -500 → "-$500" */
export function formatClp(amount: Clp): string {
  const rounded = Math.round(amount);
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${rounded < 0 ? '-' : ''}$${digits}`;
}

/**
 * Lee un monto en pesos como aparece en boletas y formularios: "$1.290", "1.290", "1290",
 * "-$990", "$ 12.400". Devuelve null si no es un monto válido (por ejemplo "1,29").
 */
export function parseClp(text: string): Clp | null {
  const compact = text.replace(/\s/g, '');
  const m = /^(-)?\$?(-)?(\d{1,3}(?:\.\d{3})+|\d+)$/.exec(compact);
  if (!m || (m[1] && m[2])) {
    return null;
  }
  const value = Number((m[3] ?? '').replace(/\./g, ''));
  return m[1] || m[2] ? -value : value;
}

/** Tope de precio para un producto: más que esto es casi seguro un error de tipeo. */
export const MAX_ITEM_PRICE = 2_000_000;

/** Precio de un producto escrito a mano: como parseClp, pero sin negativos ni montos absurdos. */
export function parsePrice(text: string): Clp | null {
  const value = parseClp(text);
  return value !== null && value >= 0 && value <= MAX_ITEM_PRICE ? value : null;
}
