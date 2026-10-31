/**
 * Huella corta de un texto (FNV-1a de 32 bits + largo). Sirve para reconocer la misma foto de
 * boleta y no pagar dos veces por leerla. No es criptográfica.
 */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(16).padStart(8, '0')}-${text.length.toString(16)}`;
}
