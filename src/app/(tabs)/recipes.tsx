import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { Button, Chip, ChipRow } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/undo-toast';
import { useDb } from '@/db/provider';
import { rememberAiQuota } from '@/db/settings-repo';
import {
  notifySettingsChanged,
  useActiveItems,
  useProductLookup,
  useToday,
} from '@/features/inventory/store';
import {
  aiErrorKey,
  aiRecipeToRecipe,
  buildRecipeRequest,
  requestAiRecipe,
} from '@/features/recipes/ai';
import { RecipeCard } from '@/features/recipes/components/recipe-card';
import { PENDING_AI_ID, setPendingAiRecipe } from '@/features/recipes/pending';
import type { RankedRecipe } from '@/features/recipes/ranking';
import { useRankedRecipes } from '@/features/recipes/use-ranked-recipes';
import { t, tn, type MessageKey } from '@/i18n';
import { radius, spacing, useThemeColors } from '@/theme';

type Filter = 'all' | 'quick' | 'chilean' | 'onePot' | 'mine';

const FILTERS: [Filter, MessageKey][] = [
  ['all', 'recipes.filterAll'],
  ['quick', 'recipes.filterQuick'],
  ['chilean', 'recipes.filterChilean'],
  ['onePot', 'recipes.filterOnePot'],
  ['mine', 'recipes.filterMine'],
];

function matchesFilter({ recipe }: RankedRecipe, filter: Filter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'quick':
      return recipe.m <= 30;
    case 'chilean':
      return recipe.tags.includes('chilena');
    case 'onePot':
      return recipe.tags.includes('una-olla');
    case 'mine':
      return recipe.source !== 'base';
  }
}

export default function RecipesScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const toast = useToast();
  const db = useDb();
  const today = useToday();
  const lookup = useProductLookup();
  const { data: items } = useActiveItems();
  const { ranked, prefs, loading } = useRankedRecipes();
  const [filter, setFilter] = useState<Filter>('all');
  const [inventing, setInventing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const visible = useMemo(() => ranked.filter((r) => matchesFilter(r, filter)), [ranked, filter]);

  const open = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });

  const invent = async () => {
    setAiError(null);
    const request = buildRecipeRequest(
      items ?? [],
      today,
      prefs,
      (item) => lookup(item.productId)?.name ?? item.displayName,
    );
    if (!request) {
      setAiError(t('recipes.aiErrors.not_enough'));
      return;
    }
    setInventing(true);
    const result = await requestAiRecipe(request);
    setInventing(false);
    if (!result.ok) {
      setAiError(t(aiErrorKey(result.error)));
      return;
    }
    setPendingAiRecipe(aiRecipeToRecipe(result.recipe));
    if (result.cached) {
      toast(t('recipes.cachedNote'));
    } else if (result.recipesLeft !== null) {
      toast(tn('recipes.recipesLeft', result.recipesLeft));
      void rememberAiQuota(db, today.slice(0, 7), { recipesLeft: result.recipesLeft })
        .then(notifySettingsChanged)
        .catch(() => {});
    }
    open(PENDING_AI_ID);
  };

  const header = (
    <View style={styles.header}>
      <View style={[styles.aiCard, { backgroundColor: c.surface }]}>
        <View style={styles.aiTitle}>
          <Ionicons name="sparkles-outline" size={20} color={c.primary} />
          <ThemedText style={styles.bold}>{t('recipes.inventWithAi')}</ThemedText>
        </View>
        <ThemedText variant="muted" style={styles.small}>
          {t('recipes.inventHint')}
        </ThemedText>
        {inventing ? (
          <View style={styles.inventing}>
            <ActivityIndicator color={c.primary} />
            <ThemedText>{t('recipes.inventing')}</ThemedText>
          </View>
        ) : (
          <Button
            label={t('recipes.inventButton')}
            icon="sparkles"
            variant="secondary"
            onPress={() => void invent()}
          />
        )}
        {aiError && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={18} color={c.dangerFg} />
            <ThemedText style={[styles.small, styles.flex, { color: c.dangerFg }]}>
              {aiError}
            </ThemedText>
          </View>
        )}
      </View>
      <ChipRow>
        {FILTERS.map(([key, label]) => (
          <Chip
            key={key}
            label={t(label)}
            selected={filter === key}
            onPress={() => setFilter(key)}
          />
        ))}
      </ChipRow>
      <Button
        label={t('recipes.newRecipe')}
        icon="add"
        variant="ghost"
        onPress={() => router.push('/recipe-editor')}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} accessibilityLabel={t('common.loading')} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.list}
      data={visible}
      keyExtractor={(r) => r.recipe.id}
      ListHeaderComponent={header}
      renderItem={({ item }) => <RecipeCard ranked={item} onPress={() => open(item.recipe.id)} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <ThemedText variant="muted" style={styles.empty}>
          {t('recipes.noResults')}
        </ThemedText>
      }
      ListFooterComponent={
        <ThemedText variant="muted" style={[styles.small, styles.footer]}>
          {t('recipes.allergenNote')}
        </ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.md, marginBottom: spacing.md },
  aiCard: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  aiTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bold: { fontWeight: '700', flex: 1 },
  small: { fontSize: 14, lineHeight: 20 },
  inventing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  separator: { height: spacing.sm },
  empty: { textAlign: 'center', paddingVertical: spacing.lg },
  footer: { marginTop: spacing.lg },
});
