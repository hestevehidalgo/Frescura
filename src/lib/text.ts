// Normalización de texto para buscar sin importar tildes, mayúsculas ni espacios.

export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** "  Plátano  Orgánico " → "platano organico" */
export function normalizeForSearch(text: string): string {
  return stripAccents(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Primera letra en mayúscula: "leche entera" → "Leche entera" */
export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('es-CL') + text.slice(1);
}
