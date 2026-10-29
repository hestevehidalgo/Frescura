import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, type IconName } from '@/components/button';
import { QuantityStepper } from '@/components/quantity-stepper';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import type { DiscardReason, InventoryItem } from '@/db/inventory-repo';
import { LOCATIONS, type Location } from '@/features/catalog/catalog';
import { relativeExpiryLabel } from '@/features/expiry/labels';
import { t } from '@/i18n';
import type { IsoDate } from '@/lib/dates';
import { formatQuantity, quantityStep } from '@/lib/quantity';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

import type { ItemAction } from '../service';

import { ExpiryDatePicker } from './date-picker';

type View_ = 'main' | 'partial' | 'discard' | 'date' | 'location' | 'split';

export const LOCATION_ICON: Record<Location, IconName> = {
  fridge: 'snow-outline',
  freezer: 'cube-outline',
  pantry: 'file-tray-stacked-outline',
};

type Props = {
  item: InventoryItem | null;
  /** 'discard' abre directo la pregunta del motivo (al deslizar a la izquierda). */
  initialView?: 'main' | 'discard';
  today: IsoDate;
  onClose: () => void;
  onAction: (item: InventoryItem, action: ItemAction) => void;
};

function ActionRow({
  icon,
  label,
  onPress,
  tone = 'normal',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'normal' | 'good' | 'danger';
}) {
  const c = useThemeColors();
  const color = tone === 'good' ? c.okFg : tone === 'danger' ? c.dangerFg : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        { backgroundColor: pressed ? c.surfaceAlt : 'transparent' },
      ]}>
      <Ionicons name={icon} size={22} color={color} />
      <ThemedText style={[styles.actionLabel, { color }]}>{label}</ThemedText>
    </Pressable>
  );
}

/** Menú de acciones de un producto (mantener presionado en la lista, o "Más acciones"). */
export function ItemActionSheet({ item, initialView = 'main', today, onClose, onAction }: Props) {
  const router = useRouter();
  // Quien lo usa le pone `key` con el producto y la vista inicial, así parte de cero cada vez.
  const [view, setView] = useState<View_>(initialView);
  const [amount, setAmount] = useState(1);

  if (!item) {
    return null;
  }

  const divisible = item.quantity > quantityStep(item.unit) + 1e-9;
  const act = (action: ItemAction) => {
    onClose();
    onAction(item, action);
  };
  const open = (next: View_, initialAmount?: number) => {
    if (initialAmount !== undefined) {
      setAmount(initialAmount);
    }
    setView(next);
  };
  const half = item.unit === 'un' ? Math.max(1, Math.floor(item.quantity / 2)) : item.quantity / 2;

  let title = item.displayName;
  let content: React.ReactNode;

  switch (view) {
    case 'main':
      content = (
        <View>
          <ActionRow
            icon="checkmark-circle"
            tone="good"
            label={t('actions.ate')}
            onPress={() => act({ type: 'consume' })}
          />
          {divisible && (
            <ActionRow
              icon="pie-chart-outline"
              label={t('actions.usedPart')}
              onPress={() => open('partial', quantityStep(item.unit) === 1 ? 1 : half)}
            />
          )}
          <ActionRow
            icon="trash-outline"
            tone="danger"
            label={t('actions.discarded')}
            onPress={() => open('discard')}
          />
          {!item.openedAt && item.location !== 'freezer' && (
            <ActionRow
              icon="cafe-outline"
              label={t('actions.opened')}
              onPress={() => act({ type: 'open' })}
            />
          )}
          {item.location === 'freezer' ? (
            <ActionRow
              icon="sunny-outline"
              label={t('actions.thawed')}
              onPress={() => act({ type: 'thaw' })}
            />
          ) : (
            !item.thawedAt && (
              <ActionRow
                icon="snow"
                label={t('actions.froze')}
                onPress={() => act({ type: 'freeze' })}
              />
            )
          )}
          <ActionRow
            icon="calendar-outline"
            label={t('actions.changeDate')}
            onPress={() => open('date')}
          />
          <ActionRow
            icon="swap-horizontal"
            label={t('actions.changeLocation')}
            onPress={() => open('location')}
          />
          {divisible && (
            <ActionRow
              icon="git-branch-outline"
              label={t('actions.split')}
              onPress={() => open('split', half)}
            />
          )}
          <ActionRow
            icon="create-outline"
            label={t('actions.edit')}
            onPress={() => {
              onClose();
              router.push({ pathname: '/edit/[id]', params: { id: item.id } });
            }}
          />
          <ActionRow
            icon="information-circle-outline"
            label={t('actions.details')}
            onPress={() => {
              onClose();
              router.push({ pathname: '/item/[id]', params: { id: item.id } });
            }}
          />
        </View>
      );
      break;
    case 'partial': {
      title = t('actions.usedHowMuch');
      const fractions =
        item.unit === 'un'
          ? []
          : ([
              ['actions.quarter', item.quantity / 4],
              ['actions.half', item.quantity / 2],
              ['actions.threeQuarters', (item.quantity * 3) / 4],
            ] as const);
      content = (
        <View style={styles.gap}>
          {fractions.length > 0 && (
            <View style={styles.fractions}>
              {fractions.map(([label, value]) => (
                <Button
                  key={label}
                  variant="secondary"
                  label={t(label)}
                  onPress={() => act({ type: 'consume', quantity: value })}
                  style={styles.flex}
                />
              ))}
            </View>
          )}
          <QuantityStepper
            value={amount}
            unit={item.unit}
            onChange={setAmount}
            max={item.quantity - quantityStep(item.unit)}
          />
          <Button
            label={t('actions.useAmount', { amount: formatQuantity(amount, item.unit) })}
            onPress={() => act({ type: 'consume', quantity: amount })}
          />
        </View>
      );
      break;
    }
    case 'discard': {
      title = t('actions.discardReason');
      const reasons: [DiscardReason | undefined, string][] = [
        ['spoiled', t('actions.reasons.spoiled')],
        ['disliked', t('actions.reasons.disliked')],
        ['leftover', t('actions.reasons.leftover')],
        [undefined, t('actions.reasons.none')],
      ];
      content = (
        <View style={styles.gap}>
          {reasons.map(([reason, label]) => (
            <Button
              key={label}
              variant={reason === 'spoiled' ? 'danger' : 'secondary'}
              label={label}
              onPress={() => act({ type: 'discard', reason })}
            />
          ))}
        </View>
      );
      break;
    }
    case 'date':
      title = t('actions.newDate');
      content = (
        <ExpiryDatePicker
          today={today}
          onPick={(date, source) => act({ type: 'setExpiry', date, source })}
        />
      );
      break;
    case 'location':
      title = t('actions.whereIsIt');
      content = (
        <View style={styles.gap}>
          {LOCATIONS.filter((l) => l !== item.location).map((location) => (
            <Button
              key={location}
              variant="secondary"
              icon={LOCATION_ICON[location]}
              label={t(`locations.${location}`)}
              onPress={() => act({ type: 'move', location })}
            />
          ))}
        </View>
      );
      break;
    case 'split':
      title = t('actions.splitHowMuch');
      content = (
        <View style={styles.gap}>
          <QuantityStepper
            value={amount}
            unit={item.unit}
            onChange={setAmount}
            max={item.quantity - quantityStep(item.unit)}
          />
          <Button
            label={t('actions.splitConfirm', { amount: formatQuantity(amount, item.unit) })}
            onPress={() => act({ type: 'split', quantity: amount })}
          />
        </View>
      );
      break;
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      title={title}
      subtitle={
        view === 'main'
          ? `${formatQuantity(item.quantity, item.unit)} · ${relativeExpiryLabel(item.expiresAt, today)}`
          : undefined
      }>
      {content}
      {view !== 'main' && (
        <Button
          variant="ghost"
          label={t('common.back')}
          icon="arrow-back"
          onPress={() => setView('main')}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  actionLabel: { fontSize: 17 },
  gap: { gap: spacing.sm },
  fractions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
