import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { isHighRisk, urgencyOf } from '@/features/expiry/expiry';
import { relativeExpiryLabel } from '@/features/expiry/labels';
import { ItemActionSheet } from '@/features/inventory/components/action-sheet';
import { URGENCY_ICON, urgencyColors } from '@/features/inventory/components/expiry-pill';
import { useItem, useProductLookup, useToday } from '@/features/inventory/store';
import { useItemActions } from '@/features/inventory/use-item-actions';
import { t } from '@/i18n';
import { formatDate, formatShort, todayLocal } from '@/lib/dates';
import { formatClp } from '@/lib/money';
import { formatQuantity } from '@/lib/quantity';
import { radius, spacing, useThemeColors } from '@/theme';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const router = useRouter();
  const today = useToday();
  const lookup = useProductLookup();
  const { data } = useItem(id);
  const { run } = useItemActions();
  const [menu, setMenu] = useState<'main' | 'discard' | null>(null);

  const item = data?.item;
  if (data && (!item || item.status !== 'active')) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ThemedText variant="muted">{t('detail.notFound')}</ThemedText>
        <Button label={t('common.back')} onPress={() => router.back()} />
      </View>
    );
  }
  if (!item) {
    return <View style={[styles.flex, { backgroundColor: c.background }]} />;
  }

  const product = lookup(item.productId);
  const urgency = urgencyOf(item.expiresAt, today);
  const { bg, fg } = urgencyColors(urgency, c);
  const highRisk = product ? isHighRisk(product) : false;

  return (
    <>
      <Stack.Screen options={{ title: item.displayName }} />
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <ThemedText style={styles.emoji}>{product?.emoji ?? '🛒'}</ThemedText>
          <ThemedText variant="title" style={styles.centerText}>
            {item.displayName}
          </ThemedText>
          <ThemedText variant="muted">
            {formatQuantity(item.quantity, item.unit)} · {t(`locations.${item.location}`)}
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: bg }]}>
          <View style={styles.row}>
            <Ionicons name={URGENCY_ICON[urgency]} size={22} color={fg} />
            <ThemedText style={[styles.expiry, { color: fg }]}>
              {relativeExpiryLabel(item.expiresAt, today)} · {formatDate(item.expiresAt)}
            </ThemedText>
          </View>
          <ThemedText style={{ color: fg, fontWeight: '600' }}>
            {t(`expiry.source.${item.expirySource}`)}
          </ThemedText>
          {item.latestAt && item.latestAt !== item.expiresAt && (
            <ThemedText style={{ color: fg }}>
              {t('expiry.range', {
                from: formatShort(item.expiresAt),
                to: formatShort(item.latestAt),
              })}
            </ThemedText>
          )}
          {item.expirySource === 'estimated' && (
            <ThemedText style={[styles.small, { color: fg }]}>{t('expiry.disclaimer')}</ThemedText>
          )}
          {highRisk && (
            <ThemedText style={[styles.small, { color: fg, fontWeight: '600' }]}>
              {t('expiry.highRiskWarning')}
            </ThemedText>
          )}
          {item.thawedAt && item.location !== 'freezer' && (
            <ThemedText style={[styles.small, { color: fg, fontWeight: '600' }]}>
              {t('expiry.noRefreeze')}
            </ThemedText>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <ThemedText>{t('detail.purchased', { date: formatDate(item.purchasedAt) })}</ThemedText>
          {item.priceClp !== null && (
            <ThemedText>{t('detail.price', { price: formatClp(item.priceClp) })}</ThemedText>
          )}
          {item.openedAt && (
            <ThemedText>{t('detail.openedOn', { date: formatDate(item.openedAt) })}</ThemedText>
          )}
          {item.frozenAt && item.location === 'freezer' && (
            <ThemedText>{t('detail.frozenOn', { date: formatDate(item.frozenAt) })}</ThemedText>
          )}
          {item.notes && <ThemedText variant="muted">{item.notes}</ThemedText>}
        </View>

        <View style={styles.buttons}>
          <Button
            icon="checkmark-circle"
            label={t('actions.ate')}
            onPress={() => run(item, { type: 'consume' })}
            style={styles.flex}
          />
          <Button
            variant="danger"
            icon="trash"
            label={t('actions.discarded')}
            onPress={() => setMenu('discard')}
            style={styles.flex}
          />
        </View>
        <Button
          variant="secondary"
          icon="ellipsis-horizontal"
          label={t('actions.moreActions')}
          onPress={() => setMenu('main')}
        />

        <ThemedText variant="subtitle" accessibilityRole="header">
          {t('detail.history')}
        </ThemedText>
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          {data.events.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <ThemedText style={styles.flex}>{t(`detail.events.${event.type}`)}</ThemedText>
              <ThemedText variant="muted">{formatDate(todayLocal(new Date(event.at)))}</ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
      <ItemActionSheet
        key={menu ?? 'closed'}
        item={menu ? item : null}
        initialView={menu ?? 'main'}
        today={today}
        onClose={() => setMenu(null)}
        onAction={(target, action) => {
          void run(target, action).then((ok) => {
            if (
              ok &&
              (action.type === 'consume' || action.type === 'discard') &&
              action.quantity === undefined
            ) {
              router.back();
            }
          });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  emoji: { fontSize: 56, lineHeight: 68 },
  centerText: { textAlign: 'center' },
  card: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  expiry: { fontSize: 18, fontWeight: '700', flex: 1 },
  small: { fontSize: 14, lineHeight: 20 },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  eventRow: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
});
