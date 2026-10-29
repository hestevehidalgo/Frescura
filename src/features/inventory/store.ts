// Los datos viven en SQLite. Las pantallas se suscriben a un contador de cambios y vuelven a leer
// la base cuando algo cambia. Sin librerías de estado.

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import type { Db } from '@/db/db';
import {
  getItem,
  listEvents,
  listItems,
  type InventoryItem,
  type ItemEvent,
} from '@/db/inventory-repo';
import { useDb } from '@/db/provider';
import { listCustomProducts } from '@/db/products-repo';
import { getSettings, type Settings } from '@/db/settings-repo';
import { getCatalogProduct, type Product } from '@/features/catalog/catalog';
import { todayLocal, type IsoDate } from '@/lib/dates';

type Listener = () => void;

function createVersion() {
  let version = 0;
  const listeners = new Set<Listener>();
  return {
    bump() {
      version += 1;
      listeners.forEach((l) => l());
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get: () => version,
  };
}

const inventoryVersion = createVersion();
const settingsVersion = createVersion();

export function notifyInventoryChanged(): void {
  inventoryVersion.bump();
}

export function notifySettingsChanged(): void {
  settingsVersion.bump();
}

export function subscribeInventory(listener: Listener): () => void {
  return inventoryVersion.subscribe(listener);
}

export function subscribeSettings(listener: Listener): () => void {
  return settingsVersion.subscribe(listener);
}

function useVersion(store: ReturnType<typeof createVersion>): number {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

type Query<T> = { data: T | undefined; error: boolean; reload: () => void };

/**
 * Lee la base y vuelve a leer cuando cambia `store`. `key` identifica la consulta (por ejemplo, el
 * id del producto): si cambia, también se vuelve a leer.
 */
function useQuery<T>(
  load: (db: Db) => Promise<T>,
  store: ReturnType<typeof createVersion>,
  key: string,
): Query<T> {
  const db = useDb();
  const version = useVersion(store);
  const [data, setData] = useState<T>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load(db)
      .then((value) => {
        if (!cancelled) {
          setData(value);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // `load` cambia en cada render; la consulta queda identificada por `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, key, version, attempt]);

  return { data, error, reload: () => setAttempt((a) => a + 1) };
}

export function useActiveItems(): Query<InventoryItem[]> {
  return useQuery((db) => listItems(db, 'active'), inventoryVersion, 'active-items');
}

export function useItem(id: string): Query<{ item: InventoryItem | null; events: ItemEvent[] }> {
  return useQuery(
    async (db) => ({ item: await getItem(db, id), events: await listEvents(db, id) }),
    inventoryVersion,
    `item-${id}`,
  );
}

/** Busca un producto del catálogo o propio por su id (los propios se leen una vez de la base). */
export function useProductLookup(): (productId: string) => Product | undefined {
  const { data } = useQuery(listCustomProducts, inventoryVersion, 'custom-products');
  return useCallback(
    (productId: string) => getCatalogProduct(productId) ?? data?.find((p) => p.id === productId),
    [data],
  );
}

export function useSettings(): Query<Settings> {
  return useQuery(getSettings, settingsVersion, 'settings');
}

/** Fecha de hoy que se actualiza al volver a la app y al pasar la medianoche. */
export function useToday(): IsoDate {
  const [today, setToday] = useState(() => todayLocal());
  useEffect(() => {
    const refresh = () => setToday(todayLocal());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
      }
    });
    const interval = setInterval(refresh, 60_000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);
  return today;
}
