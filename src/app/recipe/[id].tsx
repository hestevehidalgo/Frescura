import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Chip, ChipRow, type IconName } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/undo-toast';
import type { InventoryItem } from '@/db/inventory-repo';
import { useDb } from '@/db/provider';
import { deleteUserRecipe, saveUserRecipe } from '@/db/recipes-repo';
import { daysBetween, type IsoDate } from '@/lib/dates';
import { relativeExpiryLabel } from '@/features/expiry/labels';
import { notifyRecipesChanged, useToday } from '@/features/inventory/store';
import { useItemActions } from '@/features/inventory/use-item-actions';
import { cookedActions, itemsUsedBy, type UsedAmount } from '@/features/recipes/cooked';
import { setPendingAiRecipe } from '@/features/recipes/pending';
import type { IngredientMatch } from '@/features/recipes/ranking';
import type { Recipe } from '@/features/recipes/recipes';
import { useRecipe } from '@/features/recipes/use-recipe';
import { t, tn, type MessageKey } from '@/i18n';
import { formatDecimal, formatQuantity } from '@/lib/quantity';
import { radius, spacing, useThemeColors } from '@/theme';

const USED_OPTIONS: [UsedAmount, MessageKey][] = [
  ['all', 'recipes.usedAll'],
  ['half', 'recipes.usedHalf'],
  ['none', 'recipes.usedNone'],
];

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('es-CL') + text.slice(1);
}

function amountLabel(q: number, u: string): string {
  return `${formatDecimal(q)} ${u}`;
}

function expiryNote(item: InventoryItem, today: IsoDate): string | null {
  const days = daysBetween(today, item.expiresAt);
  if (days > 7 || days < 0) {
    return null;
  }
  return days === 0
    ? t('expiry.today')
    : t('recipes.expiresSoon', { when: relativeExpiryLabel(item.expiresAt, today).toLowerCase() });
}

function IngredientLine({ match, today }: { match: IngredientMatch; today: IsoDate }) {
  const c = useThemeColors();
  const { ingredient, item, basic } = match;
  const status: { icon: IconName; color: string; label: string } = item
    ? { icon: 'checkmark-circle', color: c.okFg, label: t('recipes.have') }
    : basic
      ? { icon: 'home-outline', color: c.textMuted, label: t('recipes.basic') }
      : ingredient.o
        ? { icon: 'ellipse-outline', color: c.textMuted, label: t('recipes.optional') }
        : { icon: 'cart-outline', color: c.warnFg, label: t('recipes.lacking') };
  const note = item ? expiryNote(item, today) : null;
  return (
    <View style={styles.ingredient}>
      <Ionicons name={status.icon} size={22} color={status.color} />
      <View style={styles.flex}>
        <ThemedText>
          {capitalize(ingredient.n)}
          <ThemedText variant="muted">{`  ${amountLabel(ingredient.q, ingredient.u)}`}</ThemedText>
        </ThemedText>
        <ThemedText style={[styles.small, { color: status.color, fontWeight: '600' }]}>
          {note ? `${status.label} · ${note}` : status.label}
        </ThemedText>
      </View>
    </View>
  );
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const db = useDb();
  const router = useRouter();
  const toast = useToast();
  const today = useToday();
  const { runEach } = useItemActions();
  const { recipe, ranked, saved } = useRecipe(id);
  const [cooking, setCooking] = useState(false);
  const [used, setUsed] = useState<Record<string, UsedAmount>>({});

  if (recipe === null) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ThemedText variant="muted">{t('recipes.notFound')}</ThemedText>
        <Button label={t('common.back')} onPress={() => router.back()} />
      </View>
    );
  }
  if (!recipe || !ranked) {
    return <View style={[styles.flex, { backgroundColor: c.background }]} />;
  }

  const usedItems = itemsUsedBy(ranked.matches);

  const save = async (toSave: Recipe) => {
    await saveUserRecipe(db, toSave);
    notifyRecipesChanged();
  };

  const saveAi = async () => {
    await save(recipe);
    setPendingAiRecipe(null);
    toast(t('recipes.saved'));
    router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } });
  };

  const remove = async () => {
    await deleteUserRecipe(db, recipe.id);
    notifyRecipesChanged();
    router.back();
    toast(t('recipes.deleted'), () => save(recipe));
  };

  const confirmCooked = async () => {
    const actions = cookedActions(usedItems, used);
    setCooking(false);
    if (actions.length === 0) {
      toast(t('recipes.cookedNothing'));
      return;
    }
    await runEach(actions, t('recipes.cookedDone'));
  };

  const meta = [
    t('recipes.minutes', { n: recipe.m }),
    tn('recipes.servings', recipe.s),
    t(`recipes.difficulty.${String(Math.min(3, Math.max(1, recipe.d))) as '1' | '2' | '3'}`),
    ...recipe.e.map((e) => t(`equipment.${e}` as MessageKey)),
  ].join(' · ');

  return (
    <>
      <Stack.Screen options={{ title: saved ? recipe.t : t('recipes.preview') }} />
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
        <View style={styles.block}>
          <ThemedText variant="title" accessibilityRole="header">
            {recipe.t}
          </ThemedText>
          <ThemedText variant="muted">{meta}</ThemedText>
          <ThemedText variant="muted" style={styles.small}>
            {t(`recipes.source.${recipe.source}`)}
          </ThemedText>
        </View>

        {recipe.source === 'ai' && (
          <View style={[styles.note, { backgroundColor: c.warnBg }]}>
            <Ionicons name="warning-outline" size={20} color={c.warnFg} />
            <ThemedText style={[styles.small, styles.flex, { color: c.warnFg }]}>
              {t('recipes.aiSafety')}
            </ThemedText>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            label={t('recipes.cookMode')}
            icon="play"
            onPress={() => router.push({ pathname: '/cook/[id]', params: { id } })}
          />
          <Button
            label={t('recipes.cooked')}
            icon="checkmark-done"
            variant="secondary"
            onPress={() => setCooking(true)}
          />
          {!saved && (
            <Button
              label={t('recipes.saveRecipe')}
              icon="bookmark-outline"
              variant="secondary"
              onPress={() => void saveAi()}
            />
          )}
        </View>

        <View style={styles.block}>
          <ThemedText variant="subtitle" accessibilityRole="header">
            {t('recipes.ingredients')}
          </ThemedText>
          {ranked.matches.map((match, index) => (
            <IngredientLine key={`${match.ingredient.n}-${index}`} match={match} today={today} />
          ))}
        </View>

        <View style={styles.block}>
          <ThemedText variant="subtitle" accessibilityRole="header">
            {t('recipes.steps')}
          </ThemedText>
          {recipe.st.map((step, index) => (
            <View key={index} style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: c.surfaceAlt }]}>
                <ThemedText style={styles.bold}>{index + 1}</ThemedText>
              </View>
              <ThemedText style={styles.flex}>{step}</ThemedText>
            </View>
          ))}
        </View>

        <ThemedText variant="muted" style={styles.small}>
          {t('recipes.allergenNote')}
        </ThemedText>

        {saved && recipe.source !== 'base' && (
          <Button
            label={t('recipes.delete')}
            icon="trash-outline"
            variant="danger"
            onPress={() => void remove()}
          />
        )}
      </ScrollView>

      <Sheet
        visible={cooking}
        onClose={() => setCooking(false)}
        title={t('recipes.cookedTitle')}
        subtitle={usedItems.length > 0 ? t('recipes.cookedBody') : undefined}>
        {usedItems.length === 0 ? (
          <ThemedText variant="muted">{t('recipes.noItemsToDeduct')}</ThemedText>
        ) : (
          usedItems.map((item) => (
            <View key={item.id} style={styles.usedRow}>
              <ThemedText style={styles.bold}>
                {item.displayName}
                <ThemedText variant="muted">{`  ${formatQuantity(item.quantity, item.unit)}`}</ThemedText>
              </ThemedText>
              <ChipRow>
                {USED_OPTIONS.map(([value, label]) => (
                  <Chip
                    key={value}
                    label={t(label)}
                    selected={(used[item.id] ?? 'all') === value}
                    onPress={() => setUsed((prev) => ({ ...prev, [item.id]: value }))}
                  />
                ))}
              </ChipRow>
            </View>
          ))
        )}
        <Button
          label={usedItems.length > 0 ? t('recipes.cookedConfirm') : t('common.close')}
          icon={usedItems.length > 0 ? 'checkmark' : undefined}
          onPress={() => (usedItems.length > 0 ? void confirmCooked() : setCooking(false))}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  block: { gap: spacing.sm },
  actions: { gap: spacing.sm },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  small: { fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: '700' },
  ingredient: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usedRow: { gap: spacing.sm, marginBottom: spacing.md },
});
