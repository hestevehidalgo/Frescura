import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useRecipe } from '@/features/recipes/use-recipe';
import { t } from '@/i18n';
import { spacing, useThemeColors } from '@/theme';

/** Modo cocina: un paso a la vez, letra grande y la pantalla siempre encendida. */
export default function CookModeScreen() {
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recipe } = useRecipe(id);
  const [step, setStep] = useState(0);

  if (!recipe) {
    return <View style={[styles.flex, { backgroundColor: c.background }]} />;
  }

  const total = recipe.st.length;
  const current = Math.min(step, total - 1);
  const last = current === total - 1;

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: recipe.t }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText variant="muted" accessibilityRole="header">
          {t('recipes.step', { n: current + 1, total })}
        </ThemedText>
        <ThemedText style={styles.stepText} accessibilityLiveRegion="polite">
          {recipe.st[current]}
        </ThemedText>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label={t('recipes.previous')}
          icon="arrow-back"
          variant="secondary"
          disabled={current === 0}
          onPress={() => setStep(current - 1)}
          style={styles.flex}
        />
        <Button
          label={last ? t('recipes.finish') : t('recipes.next')}
          icon={last ? 'checkmark' : 'arrow-forward'}
          onPress={() => (last ? router.back() : setStep(current + 1))}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  stepText: { fontSize: 28, lineHeight: 38, fontWeight: '500' },
  footer: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md },
});
