import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { joinList, t, tn } from '@/i18n';
import { radius, spacing, useThemeColors } from '@/theme';

import type { RankedRecipe } from '../ranking';

export function RecipeCard({ ranked, onPress }: { ranked: RankedRecipe; onPress: () => void }) {
  const c = useThemeColors();
  const { recipe, expiring, missing } = ranked;
  const usesExpiring = expiring.length > 0;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={styles.titleRow}>
        <ThemedText style={styles.title}>{recipe.t}</ThemedText>
        {recipe.source !== 'base' && (
          <View style={[styles.badge, { backgroundColor: c.surfaceAlt }]}>
            <ThemedText style={[styles.badgeText, { color: c.textMuted }]}>
              {t(`recipes.source.${recipe.source}`)}
            </ThemedText>
          </View>
        )}
      </View>
      <View style={styles.line}>
        <Ionicons
          name={usesExpiring ? 'leaf' : 'leaf-outline'}
          size={16}
          color={usesExpiring ? c.okFg : c.textMuted}
        />
        <ThemedText
          style={[styles.small, { color: usesExpiring ? c.okFg : c.textMuted, fontWeight: '600' }]}>
          {usesExpiring ? tn('recipes.usesExpiring', expiring.length) : t('recipes.usesNothing')}
        </ThemedText>
      </View>
      <View style={styles.line}>
        <Ionicons
          name={missing.length === 0 ? 'checkmark-circle-outline' : 'cart-outline'}
          size={16}
          color={c.textMuted}
        />
        <ThemedText variant="muted" style={[styles.small, styles.flex]} numberOfLines={2}>
          {missing.length === 0
            ? t('recipes.haveAll')
            : t('recipes.missing', { list: joinList(missing.map((m) => m.n.toLowerCase())) })}
        </ThemedText>
      </View>
      <ThemedText variant="muted" style={styles.small}>
        {[
          t('recipes.minutes', { n: recipe.m }),
          tn('recipes.servings', recipe.s),
          t(`recipes.difficulty.${String(Math.min(3, Math.max(1, recipe.d))) as '1' | '2' | '3'}`),
        ].join(' · ')}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  small: { fontSize: 14, lineHeight: 20 },
  flex: { flex: 1 },
});
