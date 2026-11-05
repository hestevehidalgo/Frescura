// Ajustar una receta a otra cantidad de porciones, con redondeos de cocina razonables.

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 12;

/** 1,5 huevos no existe: las unidades van de a media; las cucharadas de a cuarto; los gramos de a 5. */
export function scaleAmount(quantity: number, unit: string, factor: number): number {
  const value = quantity * factor;
  const roundTo = (step: number) => Math.max(step, Math.round(value / step) * step);
  switch (unit) {
    case 'un':
      return roundTo(0.5);
    case 'g':
    case 'ml':
      return value >= 100 ? roundTo(10) : roundTo(5);
    case 'cda':
    case 'cdta':
    case 'taza':
      return roundTo(0.25);
    default:
      return Math.max(0.01, Math.round(value * 100) / 100);
  }
}

export function clampServings(value: number): number {
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(value)));
}
