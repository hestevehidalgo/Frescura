import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatClp } from '@/lib/money';
import { radius, spacing, useThemeColors } from '@/theme';

export type BarRow = { key: string; label: string; clp: number };

/** Barras horizontales simples: el monto va siempre escrito, no solo como largo de la barra. */
export function BarList({ rows, max = 6 }: { rows: BarRow[]; max?: number }) {
  const c = useThemeColors();
  const shown = rows.slice(0, max);
  const top = Math.max(1, ...shown.map((r) => r.clp));
  return (
    <View style={styles.list}>
      {shown.map((row) => (
        <View
          key={row.key}
          style={styles.row}
          accessible
          accessibilityLabel={`${row.label}: ${formatClp(row.clp)}`}>
          <View style={styles.labels}>
            <ThemedText style={styles.flex} numberOfLines={1}>
              {row.label}
            </ThemedText>
            <ThemedText style={styles.amount}>{formatClp(row.clp)}</ThemedText>
          </View>
          <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
            <View
              style={[
                styles.bar,
                { backgroundColor: c.primary, width: `${Math.max(4, (row.clp / top) * 100)}%` },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { gap: 4 },
  labels: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  amount: { fontWeight: '600' },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  bar: { height: 8, borderRadius: radius.pill },
});
