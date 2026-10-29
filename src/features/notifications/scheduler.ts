// Programa en el celular los avisos que decide el planificador. Sin servidor de push.

import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import type { Db } from '@/db/db';
import { listItems } from '@/db/inventory-repo';
import { listCustomProducts } from '@/db/products-repo';
import { getSettings } from '@/db/settings-repo';
import { getCatalogProduct } from '@/features/catalog/catalog';
import { t } from '@/i18n';
import { todayLocal } from '@/lib/dates';

import { CATEGORY_SINGLE, CATEGORY_SUMMARY, planNotifications } from './planner';

export const ACTION_ATE = 'ate';
export const ACTION_DISCARDED = 'discarded';
export const ACTION_RECIPES = 'recipes';
const ANDROID_CHANNEL = 'daily-summary';

let setupDone = false;

/** Configura una sola vez: cómo se muestran los avisos con la app abierta, botones y canal. */
export async function setupNotifications(): Promise<void> {
  if (setupDone) {
    return;
  }
  setupDone = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  try {
    await Notifications.setNotificationCategoryAsync(CATEGORY_SINGLE, [
      {
        identifier: ACTION_ATE,
        buttonTitle: t('notifications.actionAte'),
        options: { opensAppToForeground: false },
      },
      {
        identifier: ACTION_DISCARDED,
        buttonTitle: t('notifications.actionDiscarded'),
        options: { opensAppToForeground: false, isDestructive: true },
      },
      {
        identifier: ACTION_RECIPES,
        buttonTitle: t('notifications.actionRecipes'),
        options: { opensAppToForeground: true },
      },
    ]);
    await Notifications.setNotificationCategoryAsync(CATEGORY_SUMMARY, [
      {
        identifier: ACTION_RECIPES,
        buttonTitle: t('notifications.actionRecipes'),
        options: { opensAppToForeground: true },
      },
    ]);
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: t('settings.notificationsEnabled'),
        importance: AndroidImportance.DEFAULT,
      });
    }
  } catch {
    // Si los botones no se pueden configurar, el aviso igual funciona sin ellos.
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  const status = await Notifications.getPermissionsAsync();
  return (
    status.granted ||
    status.ios?.status === IosAuthorizationStatus.PROVISIONAL ||
    status.ios?.status === IosAuthorizationStatus.AUTHORIZED
  );
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  await setupNotifications();
  const status = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return status.granted || status.ios?.status === IosAuthorizationStatus.AUTHORIZED;
}

let pending: Promise<void> | null = null;
let again = false;

/**
 * Borra y vuelve a programar los avisos de los próximos 14 días. Se llama al abrir la app y cada
 * vez que cambia el inventario o los ajustes. Si ya hay una reprogramación en curso, se repite al final.
 */
export async function rescheduleNotifications(db: Db): Promise<void> {
  if (pending) {
    again = true;
    return pending;
  }
  pending = (async () => {
    do {
      again = false;
      await rescheduleOnce(db);
    } while (again);
  })().finally(() => {
    pending = null;
  });
  return pending;
}

async function rescheduleOnce(db: Db): Promise<void> {
  if (!(await hasNotificationPermission())) {
    return;
  }
  await setupNotifications();
  const [items, settings, custom] = await Promise.all([
    listItems(db, 'active'),
    getSettings(db),
    listCustomProducts(db),
  ]);
  const customById = new Map(custom.map((p) => [p.id, p]));
  const plan = planNotifications({
    items,
    lookup: (id) => getCatalogProduct(id) ?? customById.get(id),
    settings,
    today: todayLocal(),
    now: new Date(),
  });
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const notification of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: notification.id,
      content: {
        title: notification.title,
        body: notification.body,
        categoryIdentifier: notification.categoryId,
        data: { itemId: notification.itemId, kind: notification.kind },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notification.date,
        channelId: ANDROID_CHANNEL,
      },
    });
  }
}
