// Cantidades con coma decimal, como en Chile: "1,234 KG", "1,5 l".

export const UNITS = ['un', 'kg', 'g', 'l', 'ml'] as const;
export type Unit = (typeof UNITS)[number];

export function isUnit(value: string): value is Unit {
  return (UNITS as readonly string[]).includes(value);
}

/** "1,234" → 1.234; "2" → 2; "1.5" también se acepta al escribir a mano. */
export function parseDecimal(text: string): number | null {
  const compact = text.trim().replace(/\s/g, '');
  if (!/^\d+([.,]\d+)?$/.test(compact)) {
    return null;
  }
  return Number(compact.replace(',', '.'));
}

/** 1.5 → "1,5"; 2 → "2"; 0.333 → "0,33" */
export function formatDecimal(value: number, maxDecimals = 2): string {
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(value * factor) / factor;
  return String(rounded).replace('.', ',');
}

/** 1.5, "kg" → "1,5 kg"; 2, "un" → "2 un" */
export function formatQuantity(quantity: number, unit: Unit): string {
  return `${formatDecimal(quantity)} ${unit}`;
}

/** Paso razonable para subir o bajar una cantidad con botones +/−. */
export function quantityStep(unit: Unit): number {
  switch (unit) {
    case 'kg':
    case 'l':
      return 0.25;
    case 'g':
    case 'ml':
      return 100;
    default:
      return 1;
  }
}
