import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useStatsData } from '@/features/inventory/store';
import { t } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { radius, spacing, useThemeColors } from '@/theme';

import { perUnitLabel } from '../format';
import { priceHistory } from '../stats';

const MAX_ROWS = 6;

/** Precios que pagaste por este producto, del más reciente al más antiguo. */
export function PriceHistory({ productId }: { productId: string }) {
  const c = useThemeColors();
  const { data } = useStatsData();
  const points = useMemo(
    () => (data ? (priceHistory(data).get(productId) ?? []) : []),
    [data, productId],
  );
  if (points.length < 2) {
    return null;
  }
  return (
    <>
      <ThemedText variant="subtitle" accessibilityRole="header">
        {t('detail.prices')}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        {points.slice(0, MAX_ROWS).map((p) => (
          <View key={p.itemId} style={styles.row}>
            <ThemedText style={styles.price}>{perUnitLabel(p.perUnitClp, p.unit)}</ThemedText>
            <ThemedText variant="muted" style={styles.flex} numberOfLines={1}>
              {p.store ?? t('summary.noStore')}
            </ThemedText>
            <ThemedText variant="muted">{formatDate(p.date)}</ThemedText>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  price: { fontWeight: '700', minWidth: 96 },
  flex: { flex: 1 },
});
