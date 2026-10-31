import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { InventoryItem } from '@/db/inventory-repo';
import { relativeExpiryLabel } from '@/features/expiry/labels';
import { t, tn } from '@/i18n';
import type { IsoDate } from '@/lib/dates';
import { formatQuantity } from '@/lib/quantity';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

import type { Row } from '../grouping';

import { ExpiryPill } from './expiry-pill';

type Props = {
  row: Row;
  emoji: string;
  today: IsoDate;
  selecting: boolean;
  selected: boolean;
  onPress: (item: InventoryItem) => void;
  onLongPress: (item: InventoryItem) => void;
  onAte: (item: InventoryItem) => void;
  onDiscard: (item: InventoryItem) => void;
};

function RowButton({
  kind,
  label,
  onPress,
}: {
  kind: 'ate' | 'discard';
  label: string;
  onPress: () => void;
}) {
  const c = useThemeColors();
  const ate = kind === 'ate';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.rowButton,
        { backgroundColor: ate ? c.okBg : c.dangerBg, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Ionicons
        name={ate ? 'checkmark' : 'trash-outline'}
        size={22}
        color={ate ? c.okFg : c.dangerFg}
      />
    </Pressable>
  );
}

function ItemRowBase({
  row,
  emoji,
  today,
  selecting,
  selected,
  onPress,
  onLongPress,
  onAte,
  onDiscard,
}: Props) {
  const c = useThemeColors();
  const { item, urgency } = row;

  const details = [
    formatQuantity(item.quantity, item.unit),
    t(`locations.${item.location}`),
    t(`expiry.source.${item.expirySource}`),
  ].join(' · ');

  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityState={selecting ? { selected } : undefined}
      accessibilityLabel={`${item.displayName}, ${relativeExpiryLabel(item.expiresAt, today)}, ${details}`}
      accessibilityActions={[
        { name: 'ate', label: t('actions.ate') },
        { name: 'discard', label: t('actions.discarded') },
        { name: 'longpress', label: t('actions.moreActions') },
      ]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'ate') onAte(item);
        if (e.nativeEvent.actionName === 'discard') onDiscard(item);
        if (e.nativeEvent.actionName === 'longpress') onLongPress(item);
      }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: selected ? c.okBg : c.surface, opacity: pressed ? 0.85 : 1 },
      ]}>
      {selecting && (
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
          color={selected ? c.primary : c.tabInactive}
        />
      )}
      <View style={[styles.emoji, { backgroundColor: c.surfaceAlt }]}>
        <ThemedText style={styles.emojiText}>{emoji}</ThemedText>
      </View>
      <View style={styles.middle}>
        <ThemedText style={styles.name} numberOfLines={1}>
          {item.displayName}
        </ThemedText>
        <ThemedText variant="muted" style={styles.details} numberOfLines={1}>
          {details}
        </ThemedText>
        <View style={styles.pill}>
          <ExpiryPill expiresAt={item.expiresAt} urgency={urgency} today={today} />
        </View>
        {row.lotCount > 1 && (
          <ThemedText style={[styles.lot, { color: row.useFirst ? c.primary : c.textMuted }]}>
            {row.useFirst
              ? `${t('home.useFirst')} · ${tn('home.lots', row.lotCount)}`
              : tn('home.lots', row.lotCount)}
          </ThemedText>
        )}
      </View>
      {!selecting && (
        <View style={styles.buttons}>
          <RowButton
            kind="ate"
            label={`${t('actions.ate')}: ${item.displayName}`}
            onPress={() => onAte(item)}
          />
          <RowButton
            kind="discard"
            label={`${t('actions.discarded')}: ${item.displayName}`}
            onPress={() => onDiscard(item)}
          />
        </View>
      )}
    </Pressable>
  );
}

export const ItemRow = memo(ItemRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 64,
  },
  emoji: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: { fontSize: 24, lineHeight: 30 },
  middle: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '600' },
  details: { fontSize: 13, lineHeight: 18 },
  lot: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  pill: { flexDirection: 'row', marginTop: 2 },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  rowButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
