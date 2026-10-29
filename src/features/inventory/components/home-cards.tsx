import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import type { InventoryItem } from '@/db/inventory-repo';
import { relativeExpiryLabel } from '@/features/expiry/labels';
import { t } from '@/i18n';
import type { IsoDate } from '@/lib/dates';
import { radius, spacing, useThemeColors } from '@/theme';

/** "Hoy cocina con esto": los 3 productos que vencen primero. */
export function CookTodayCard({
  items,
  today,
  emojiFor,
}: {
  items: InventoryItem[];
  today: IsoDate;
  emojiFor: (item: InventoryItem) => string;
}) {
  const c = useThemeColors();
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={[styles.card, { backgroundColor: c.okBg }]}>
      <View style={styles.titleRow}>
        <Ionicons name="restaurant" size={20} color={c.okFg} />
        <ThemedText style={[styles.title, { color: c.okFg }]} accessibilityRole="header">
          {t('home.cookTodayTitle')}
        </ThemedText>
      </View>
      {items.map((item) => (
        <View key={item.id} style={styles.line}>
          <ThemedText style={styles.emoji}>{emojiFor(item)}</ThemedText>
          <ThemedText style={[styles.name, { color: c.okFg }]} numberOfLines={1}>
            {item.displayName}
          </ThemedText>
          <ThemedText style={[styles.when, { color: c.okFg }]}>
            {relativeExpiryLabel(item.expiresAt, today)}
          </ThemedText>
        </View>
      ))}
      <ThemedText style={[styles.footer, { color: c.okFg }]}>
        {t('home.cookTodayRecipes')}
      </ThemedText>
    </View>
  );
}

/** Cierre del ciclo: "¿Qué pasó con el yogur?" con tres botones. */
export function ExpiredPrompt({
  item,
  highRisk,
  onAte,
  onFroze,
  onDiscarded,
}: {
  item: InventoryItem;
  highRisk: boolean;
  onAte: () => void;
  onFroze: () => void;
  onDiscarded: () => void;
}) {
  const c = useThemeColors();
  return (
    <View style={[styles.card, { backgroundColor: c.dangerBg }]}>
      <View style={styles.titleRow}>
        <Ionicons name="help-circle" size={20} color={c.dangerFg} />
        <ThemedText style={[styles.title, { color: c.dangerFg }]}>
          {t('home.whatHappened', { name: item.displayName.toLowerCase() })}
        </ThemedText>
      </View>
      <View style={styles.buttons}>
        <Button variant="secondary" label={t('actions.ate')} onPress={onAte} style={styles.flex} />
        {/* Algo de alto riesgo ya vencido no se debe congelar. */}
        {!highRisk && item.location !== 'freezer' && (
          <Button
            variant="secondary"
            label={t('actions.froze')}
            onPress={onFroze}
            style={styles.flex}
          />
        )}
        <Button
          variant="secondary"
          label={t('actions.discarded')}
          onPress={onDiscarded}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 17, fontWeight: '700', flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 20, lineHeight: 26 },
  name: { flex: 1, fontSize: 16, fontWeight: '600' },
  when: { fontSize: 14, fontWeight: '600' },
  footer: { fontSize: 14 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  flex: { flexGrow: 1, minWidth: 96 },
});
