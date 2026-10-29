// Arma la lista de Inicio: secciones por urgencia, filtros, búsqueda y lotes. Sin efectos.

import type { InventoryItem } from '@/db/inventory-repo';
import type { Location } from '@/features/catalog/catalog';
import { urgencyOf, URGENCIES, type Urgency } from '@/features/expiry/expiry';
import type { IsoDate } from '@/lib/dates';
import { normalizeForSearch } from '@/lib/text';

export type Row = {
  item: InventoryItem;
  urgency: Urgency;
  /** Cantidad de lotes activos del mismo producto. */
  lotCount: number;
  /** El lote que conviene usar primero (el que vence antes), si hay más de uno. */
  useFirst: boolean;
};

export type Section = { urgency: Urgency; data: Row[] };

export type HomeModel = {
  sections: Section[];
  /** Lo vencido, para preguntar qué pasó. */
  expired: InventoryItem[];
  /** Los productos que vencen primero, para "Hoy cocina con esto". */
  cookToday: InventoryItem[];
  total: number;
};

export type HomeFilter = { location: Location | 'all'; query: string };

function lotKey(item: InventoryItem): string {
  return `${item.productId}|${item.displayName}`;
}

export function buildHome(items: InventoryItem[], today: IsoDate, filter: HomeFilter): HomeModel {
  const sorted = [...items].sort(
    (a, b) =>
      a.expiresAt.localeCompare(b.expiresAt) || a.displayName.localeCompare(b.displayName, 'es'),
  );

  const lots = new Map<string, InventoryItem[]>();
  for (const item of sorted) {
    const key = lotKey(item);
    lots.set(key, [...(lots.get(key) ?? []), item]);
  }

  const query = normalizeForSearch(filter.query);
  const visible = sorted.filter(
    (item) =>
      (filter.location === 'all' || item.location === filter.location) &&
      (!query || normalizeForSearch(item.displayName).includes(query)),
  );

  const byUrgency = new Map<Urgency, Row[]>(URGENCIES.map((u) => [u, []]));
  for (const item of visible) {
    const group = lots.get(lotKey(item)) ?? [item];
    const urgency = urgencyOf(item.expiresAt, today);
    byUrgency.get(urgency)?.push({
      item,
      urgency,
      lotCount: group.length,
      useFirst: group.length > 1 && group[0]?.id === item.id,
    });
  }

  return {
    sections: URGENCIES.map((urgency) => ({ urgency, data: byUrgency.get(urgency) ?? [] })).filter(
      (s) => s.data.length > 0,
    ),
    expired: sorted.filter((item) => urgencyOf(item.expiresAt, today) === 'expired'),
    cookToday: sorted
      .filter((item) => {
        const urgency = urgencyOf(item.expiresAt, today);
        return (
          item.location !== 'freezer' &&
          (urgency === 'today' || urgency === 'soon' || urgency === 'week')
        );
      })
      .slice(0, 3),
    total: items.length,
  };
}
