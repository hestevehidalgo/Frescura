import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import type { Db } from '@/db/db';
import { getItem } from '@/db/inventory-repo';
import { useDb } from '@/db/provider';
import { performAction } from '@/features/inventory/service';
import {
  notifyInventoryChanged,
  subscribeInventory,
  subscribeSettings,
} from '@/features/inventory/store';

import { ACTION_ATE, ACTION_DISCARDED, rescheduleNotifications } from './scheduler';

const handled = new Set<string>();

async function handleResponse(
  db: Db,
  response: Notifications.NotificationResponse,
  goHome: () => void,
): Promise<void> {
  const key = `${response.notification.request.identifier}|${response.actionIdentifier}`;
  if (handled.has(key)) {
    return;
  }
  handled.add(key);
  const itemId = response.notification.request.content.data?.itemId;
  const action = response.actionIdentifier;
  if (typeof itemId === 'string' && (action === ACTION_ATE || action === ACTION_DISCARDED)) {
    const item = await getItem(db, itemId);
    if (item?.status === 'active') {
      await performAction(db, itemId, { type: action === ACTION_ATE ? 'consume' : 'discard' });
      notifyInventoryChanged();
    }
    return;
  }
  // Tocar el aviso o "Ver recetas": por ahora abre Inicio (las recetas llegan en la fase 3).
  goHome();
}

/**
 * Mantiene los avisos al día: reprograma al abrir la app y cuando cambian el inventario o los
 * ajustes, y atiende los botones "Me lo comí" / "Lo boté" de los avisos.
 */
export function useNotificationSync(): void {
  const db = useDb();
  const router = useRouter();

  useEffect(() => {
    // Los avisos locales solo existen en iOS y Android (la versión web es para revisar pantallas).
    if (Platform.OS === 'web') {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) {
        clearTimeout(timer);
      }
      // Espera un momento para agrupar varios cambios seguidos en una sola reprogramación.
      timer = setTimeout(() => void rescheduleNotifications(db).catch(() => {}), 800);
    };
    schedule();
    const unsubscribeInventory = subscribeInventory(schedule);
    const unsubscribeSettings = subscribeSettings(schedule);
    const appState = AppState.addEventListener(
      'change',
      (state) => state === 'active' && schedule(),
    );
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      unsubscribeInventory();
      unsubscribeSettings();
      appState.remove();
    };
  }, [db]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    const goHome = () => router.navigate('/');
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      void handleResponse(db, last, goHome).catch(() => {});
    }
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleResponse(db, response, goHome).catch(() => {});
    });
    return () => subscription.remove();
  }, [db, router]);
}
