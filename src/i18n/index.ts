import { esCL, type Messages } from './es-CL';

// Une las claves anidadas con puntos: 'tabs.home', 'home.emptyTitle', etc.
type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = T extends string
  ? never
  : { [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>> }[keyof T];

export type MessageKey = Paths<Messages>;
/** Claves con variantes { one, other } para usar con tn(). */
export type PluralKey = MessageKey extends infer K
  ? K extends `${infer P}.one`
    ? P
    : never
  : never;

type Params = Record<string, string | number>;

const messages: Messages = esCL;

function lookup(key: string): string | null {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      messages,
    );
  return typeof value === 'string' ? value : null;
}

/**
 * Devuelve el texto de una clave. Los marcadores {nombre} se reemplazan con `params`.
 * Ejemplo: t('expiry.inDays', { n: 3 }).
 */
export function t(key: MessageKey, params?: Params): string {
  const value = lookup(key);
  if (value === null) {
    return key;
  }
  return params ? interpolate(value, params) : value;
}

/** Texto según cantidad: tn('toasts.added', 1) → "Agregaste 1 producto". */
export function tn(key: PluralKey, n: number, params?: Params): string {
  const variant = n === 1 ? 'one' : 'other';
  const value = lookup(`${key}.${variant}`);
  return value === null ? key : interpolate(value, { n, ...params });
}

export function interpolate(template: string, params: Params): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** "palta, tomate y lechuga" */
export function joinList(items: string[]): string {
  if (items.length <= 1) {
    return items.join('');
  }
  return `${items.slice(0, -1).join(', ')} ${t('notifications.and')} ${items[items.length - 1]}`;
}
