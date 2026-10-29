import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

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

function SwipeAction({ side }: { side: 'ate' | 'discard' }) {
  const c = useThemeColors();
  const ate = side === 'ate';
  return (
    <View
      style={[
        styles.action,
        ate ? styles.actionLeft : styles.actionRight,
        { backgroundColor: ate ? c.okBg : c.dangerBg },
      ]}>
      <Ionicons
        name={ate ? 'checkmark-circle' : 'trash'}
        size={22}
        color={ate ? c.okFg : c.dangerFg}
      />
      <ThemedText style={[styles.actionText, { color: ate ? c.okFg : c.dangerFg }]}>
        {t(ate ? 'actions.ate' : 'actions.discarded')}
      </ThemedText>
    </View>
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
  const swipeable = useRef<SwipeableMethods>(null);
  const { item, urgency } = row;

  const details = [
    formatQuantity(item.quantity, item.unit),
    t(`locations.${item.location}`),
    t(`expiry.source.${item.expirySource}`),
  ].join(' · ');

  const content = (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityState={selecting ? { selected } : undefined}
      accessibilityLabel={`${item.displayName}, ${relativeExpiryLabel(item.expiresAt, today)}, ${details}`}
      accessibilityHint={selecting ? undefined : t('home.swipeHint')}
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
        {row.lotCount > 1 && (
          <ThemedText style={[styles.lot, { color: row.useFirst ? c.primary : c.textMuted }]}>
            {row.useFirst
              ? `${t('home.useFirst')} · ${tn('home.lots', row.lotCount)}`
              : tn('home.lots', row.lotCount)}
          </ThemedText>
        )}
      </View>
      <ExpiryPill expiresAt={item.expiresAt} urgency={urgency} today={today} />
    </Pressable>
  );

  if (selecting) {
    return content;
  }

  return (
    <ReanimatedSwipeable
      ref={swipeable}
      friction={2}
      leftThreshold={80}
      rightThreshold={80}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => <SwipeAction side="ate" />}
      renderRightActions={() => <SwipeAction side="discard" />}
      onSwipeableOpen={(direction) => {
        swipeable.current?.close();
        // Deslizar a la derecha abre las acciones de la izquierda: "Me lo comí".
        if (direction === SwipeDirection.RIGHT) {
          onAte(item);
        } else {
          onDiscard(item);
        }
      }}>
      {content}
    </ReanimatedSwipeable>
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
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  actionLeft: { justifyContent: 'flex-start' },
  actionRight: { justifyContent: 'flex-end' },
  actionText: { fontWeight: '700' },
});
