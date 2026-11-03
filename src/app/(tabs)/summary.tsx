import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, type IconName } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { getCategory } from '@/features/catalog/catalog';
import { useProductLookup, useStatsData, useToday } from '@/features/inventory/store';
import { BarList } from '@/features/stats/components/bar-list';
import { monthLabel, monthName, perUnitLabel } from '@/features/stats/format';
import {
  buildTips,
  monthlyStats,
  monthOf,
  priceComparisons,
  priceHistory,
  shiftMonth,
  tipProductOf,
  UNKNOWN_STORE,
  weeklyStreak,
  type Tip,
} from '@/features/stats/stats';
import { t, tn } from '@/i18n';
import { formatClp } from '@/lib/money';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

const MAX_PRICE_ROWS = 5;

function tipText(tip: Tip): string {
  const params = { ...tip.params };
  if (typeof params.amount === 'number') {
    params.amount = formatClp(params.amount);
  }
  return t(`summary.tips.${tip.key}`, params);
}

function categoryName(id: string): string {
  return getCategory(id)?.name ?? id;
}

export default function SummaryScreen() {
  const c = useThemeColors();
  const today = useToday();
  const lookup = useProductLookup();
  const { data, error, reload } = useStatsData();
  const current = monthOf(today);
  const [month, setMonth] = useState(current);

  const categoryOf = useMemo(
    () => (productId: string) => lookup(productId)?.categoryId ?? 'otros',
    [lookup],
  );

  const view = useMemo(() => {
    if (!data) {
      return null;
    }
    const stats = monthlyStats(data, month, categoryOf);
    const previous = monthlyStats(data, shiftMonth(month, -1), categoryOf);
    const tips = buildTips(
      data,
      today,
      stats,
      (id) => {
        const product = lookup(id);
        return product ? tipProductOf(product) : undefined;
      },
      (id) => categoryName(id).toLowerCase(),
    );
    const comparisons = priceComparisons(priceHistory(data)).slice(0, MAX_PRICE_ROWS);
    const firstMonth = data.items.reduce(
      (min, item) => (monthOf(item.purchasedAt) < min ? monthOf(item.purchasedAt) : min),
      current,
    );
    return {
      stats,
      previous,
      tips,
      comparisons,
      firstMonth,
      streak: weeklyStreak(data, today),
    };
  }, [data, month, categoryOf, lookup, today, current]);

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ThemedText>{t('common.loadError')}</ThemedText>
        <Button label={t('common.retry')} onPress={reload} />
      </View>
    );
  }
  if (!data || !view) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} accessibilityLabel={t('common.loading')} />
      </View>
    );
  }
  if (data.items.length === 0) {
    return (
      <EmptyState
        icon="stats-chart-outline"
        title={t('summary.emptyTitle')}
        body={t('summary.emptyBody')}
      />
    );
  }

  const { stats, previous, tips, comparisons, firstMonth, streak } = view;
  const hasActivity = stats.consumedCount + stats.discardedCount + stats.boughtItems > 0;
  const wasteDiff = stats.wastedClp - previous.wastedClp;
  const previousName = monthName(shiftMonth(month, -1));
  const withoutPrice = stats.boughtItems - stats.pricedItems;

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <View style={styles.monthRow}>
        <MonthButton
          icon="chevron-back"
          label={t('summary.previousMonth')}
          disabled={month <= firstMonth}
          onPress={() => setMonth(shiftMonth(month, -1))}
        />
        <ThemedText variant="subtitle" accessibilityRole="header" style={styles.monthTitle}>
          {monthLabel(month)}
        </ThemedText>
        <MonthButton
          icon="chevron-forward"
          label={t('summary.nextMonth')}
          disabled={month >= current}
          onPress={() => setMonth(shiftMonth(month, 1))}
        />
      </View>

      {!hasActivity && (
        <ThemedText variant="muted" style={styles.centerText}>
          {t('summary.noMonthData', { month: monthName(month) })}
        </ThemedText>
      )}

      <View style={styles.money}>
        <MoneyCard
          icon="leaf"
          title={t('summary.saved')}
          amount={stats.savedClp}
          hint={t('summary.savedHint')}
          bg={c.okBg}
          fg={c.okFg}
        />
        <MoneyCard
          icon="trash"
          title={t('summary.wasted')}
          amount={stats.wastedClp}
          hint={
            previous.consumedCount + previous.discardedCount > 0
              ? wasteDiff === 0
                ? t('summary.sameAsLast', { month: previousName })
                : t(wasteDiff < 0 ? 'summary.lessThanLast' : 'summary.moreThanLast', {
                    amount: formatClp(Math.abs(wasteDiff)),
                    month: previousName,
                  })
              : t('summary.wastedHint')
          }
          bg={c.dangerBg}
          fg={c.dangerFg}
        />
      </View>

      <Section>
        {stats.usedShare === null ? (
          <ThemedText variant="muted">{t('summary.usedNone')}</ThemedText>
        ) : (
          <View
            accessible
            accessibilityLabel={t('summary.used', { pct: Math.round(stats.usedShare * 100) })}
            style={styles.gap}>
            <ThemedText style={styles.bold}>
              {t('summary.used', { pct: Math.round(stats.usedShare * 100) })}
            </ThemedText>
            <View style={[styles.track, { backgroundColor: c.dangerBg }]}>
              <View
                style={[
                  styles.bar,
                  { backgroundColor: c.primary, width: `${Math.round(stats.usedShare * 100)}%` },
                ]}
              />
            </View>
            <ThemedText variant="muted" style={styles.small}>
              {tn('summary.usedDetail', stats.consumedCount + stats.discardedCount)}
            </ThemedText>
          </View>
        )}
        {month === current && streak > 0 && (
          <View style={styles.line}>
            <Ionicons name="flame-outline" size={20} color={c.primary} />
            <ThemedText style={styles.flex}>{tn('summary.streak', streak)}</ThemedText>
          </View>
        )}
      </Section>

      {tips.length > 0 && (
        <Section title={t('summary.tipsTitle')}>
          {tips.map((tip) => (
            <View key={`${tip.key}-${String(tip.params.name ?? '')}`} style={styles.line}>
              <Ionicons
                name={tip.key === 'goodMonth' ? 'happy-outline' : 'bulb-outline'}
                size={20}
                color={c.primary}
              />
              <ThemedText style={styles.flex}>{tipText(tip)}</ThemedText>
            </View>
          ))}
        </Section>
      )}

      {stats.spentClp > 0 && (
        <Section title={t('summary.spentTitle')}>
          <ThemedText style={styles.big}>
            {t('summary.spentTotal', { amount: formatClp(stats.spentClp) })}
          </ThemedText>
          {withoutPrice > 0 && (
            <ThemedText variant="muted" style={styles.small}>
              {tn('summary.withoutPrice', withoutPrice)}
            </ThemedText>
          )}
          <ThemedText style={styles.bold}>{t('summary.byCategory')}</ThemedText>
          <BarList
            rows={stats.spendingByCategory.map((s) => ({
              key: s.key,
              label: categoryName(s.key),
              clp: s.clp,
            }))}
          />
          <ThemedText style={styles.bold}>{t('summary.byStore')}</ThemedText>
          <BarList
            rows={stats.spendingByStore.map((s) => ({
              key: s.key || 'none',
              label: s.key === UNKNOWN_STORE ? t('summary.noStore') : s.key,
              clp: s.clp,
            }))}
          />
        </Section>
      )}

      <Section title={t('summary.pricesTitle')}>
        {comparisons.length === 0 ? (
          <ThemedText variant="muted">{t('summary.pricesEmpty')}</ThemedText>
        ) : (
          comparisons.map((comparison) => {
            const product = lookup(comparison.productId);
            const cheapest = comparison.stores[0];
            return (
              <View key={`${comparison.productId}-${comparison.unit}`} style={styles.priceBlock}>
                <ThemedText style={styles.bold}>
                  {`${product?.emoji ?? '🛒'} ${product?.name ?? comparison.productId}`}
                </ThemedText>
                {comparison.stores.map((s) => (
                  <View key={s.store} style={styles.priceRow}>
                    <ThemedText style={styles.flex} numberOfLines={1}>
                      {s.store}
                    </ThemedText>
                    <ThemedText>{perUnitLabel(s.perUnitClp, comparison.unit)}</ThemedText>
                  </View>
                ))}
                {cheapest && comparison.savingPct > 0 && (
                  <View style={styles.line}>
                    <Ionicons name="pricetag-outline" size={16} color={c.okFg} />
                    <ThemedText style={[styles.small, { color: c.okFg, fontWeight: '600' }]}>
                      {t('summary.cheaperAt', { store: cheapest.store, pct: comparison.savingPct })}
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          })
        )}
      </Section>
    </ScrollView>
  );
}

function MonthButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.monthButton,
        { backgroundColor: c.surface, opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
      ]}>
      <Ionicons name={icon} size={22} color={c.text} />
    </Pressable>
  );
}

function MoneyCard({
  icon,
  title,
  amount,
  hint,
  bg,
  fg,
}: {
  icon: IconName;
  title: string;
  amount: number;
  hint: string;
  bg: string;
  fg: string;
}) {
  return (
    <View style={[styles.moneyCard, { backgroundColor: bg }]} accessible>
      <View style={styles.line}>
        <Ionicons name={icon} size={18} color={fg} />
        <ThemedText style={[styles.bold, { color: fg }]}>{title}</ThemedText>
      </View>
      <ThemedText style={[styles.amount, { color: fg }]}>{formatClp(amount)}</ThemedText>
      <ThemedText style={[styles.small, { color: fg }]}>{hint}</ThemedText>
    </View>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  const c = useThemeColors();
  return (
    <View style={[styles.section, { backgroundColor: c.surface }]}>
      {title && (
        <ThemedText variant="subtitle" accessibilityRole="header">
          {title}
        </ThemedText>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  centerText: { textAlign: 'center' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  monthTitle: { flex: 1, textAlign: 'center', textTransform: 'capitalize' },
  monthButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  money: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  moneyCard: {
    flexGrow: 1,
    flexBasis: 150,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  amount: { fontSize: 30, lineHeight: 38, fontWeight: '700' },
  section: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gap: { gap: spacing.xs },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  big: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  small: { fontSize: 14, lineHeight: 20 },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  bar: { height: 10, borderRadius: radius.pill },
  priceBlock: { gap: 4, paddingVertical: spacing.xs },
  priceRow: { flexDirection: 'row', gap: spacing.sm },
});
