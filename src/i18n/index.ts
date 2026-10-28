import { esCL, type Messages } from './es-CL';

// Une las claves anidadas con puntos: 'tabs.home', 'home.emptyTitle', etc.
type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = T extends string
  ? never
  : { [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>> }[keyof T];

export type MessageKey = Paths<Messages>;

const messages: Messages = esCL;

/**
 * Devuelve el texto de una clave. Los marcadores {nombre} se reemplazan con `params`.
 * Ejemplo: t('items.count', { n: 3 }).
 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      messages,
    );
  if (typeof value !== 'string') {
    return key;
  }
  return params ? interpolate(value, params) : value;
}

export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
