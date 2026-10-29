import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

import { useToast } from '@/components/undo-toast';
import { getItem, type InventoryItem } from '@/db/inventory-repo';
import { useDb } from '@/db/provider';
import { t, tn } from '@/i18n';
import { formatShort } from '@/lib/dates';
import { formatQuantity } from '@/lib/quantity';

import { performAction, undoAction, type ItemAction, type UndoHandle } from './service';
import { notifyInventoryChanged } from './store';

function successMessage(
  before: InventoryItem,
  after: InventoryItem | null,
  action: ItemAction,
): string {
  const name = before.displayName;
  switch (action.type) {
    case 'consume':
      return action.quantity !== undefined && after?.status === 'active'
        ? t('toasts.used', { amount: formatQuantity(action.quantity, before.unit), name })
        : t('toasts.ate', { name });
    case 'discard':
      return t('toasts.discarded', { name });
    case 'open':
      return t('toasts.opened', { name, date: formatShort(after?.expiresAt ?? before.expiresAt) });
    case 'freeze':
      return t('toasts.froze', { name });
    case 'thaw':
      return t('toasts.thawed', { name });
    case 'move':
      return t('toasts.moved', { name, location: t(`locations.${action.location}`) });
    case 'setExpiry':
      return t('toasts.dateChanged', { date: formatShort(action.date) });
    case 'edit':
      return t('toasts.edited');
    case 'split':
      return t('toasts.split');
  }
}

/** Ejecuta acciones sobre el inventario con vibración leve y aviso para deshacer. */
export function useItemActions() {
  const db = useDb();
  const toast = useToast();

  const undoAll = useCallback(
    async (handles: UndoHandle[]) => {
      for (const handle of [...handles].reverse()) {
        await undoAction(db, handle);
      }
      notifyInventoryChanged();
    },
    [db],
  );

  const run = useCallback(
    async (item: InventoryItem, action: ItemAction): Promise<boolean> => {
      try {
        const handle = await performAction(db, item.id, action);
        notifyInventoryChanged();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const after = await getItem(db, item.id);
        toast(successMessage(item, after, action), () => undoAll([handle]));
        return true;
      } catch {
        toast(t('toasts.error'));
        return false;
      }
    },
    [db, toast, undoAll],
  );

  const runMany = useCallback(
    async (
      items: InventoryItem[],
      action: Extract<ItemAction, { type: 'consume' | 'discard' }>,
    ) => {
      const handles: UndoHandle[] = [];
      try {
        for (const item of items) {
          handles.push(await performAction(db, item.id, action));
        }
        notifyInventoryChanged();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const key = action.type === 'consume' ? 'toasts.bulkAte' : 'toasts.bulkDiscarded';
        toast(tn(key, handles.length), () => undoAll(handles));
      } catch {
        await undoAll(handles);
        toast(t('toasts.error'));
      }
    },
    [db, toast, undoAll],
  );

  return { run, runMany };
}
