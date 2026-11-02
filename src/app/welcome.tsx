import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, type IconName } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useDb } from '@/db/provider';
import { saveSettings, type Settings } from '@/db/settings-repo';
import { notifySettingsChanged, useSettings } from '@/features/inventory/store';
import {
  AllergenChips,
  DietChips,
  EquipmentChips,
  PantryChips,
} from '@/features/recipes/components/preference-chips';
import { t } from '@/i18n';
import { spacing, useThemeColors } from '@/theme';

const POINTS: [IconName, 'scan' | 'expiry' | 'recipes'][] = [
  ['receipt-outline', 'scan'],
  ['time-outline', 'expiry'],
  ['restaurant-outline', 'recipes'],
];

/** Bienvenida: máximo 3 pantallas, todas saltables. Sin registro. */
export default function WelcomeScreen() {
  const c = useThemeColors();
  const db = useDb();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: settings } = useSettings();
  const [step, setStep] = useState(0);

  if (!settings) {
    return <View style={[styles.flex, { backgroundColor: c.background }]} />;
  }

  const update = async (patch: Partial<Settings>) => {
    await saveSettings(db, patch);
    notifySettingsChanged();
  };

  const finish = async () => {
    await update({ onboardingDone: true });
    router.replace('/');
  };

  const last = step === 2;

  return (
    <View style={[styles.flex, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.top}>
        <ThemedText variant="muted">{`${step + 1} / 3`}</ThemedText>
        <Button variant="ghost" label={t('welcome.skip')} onPress={() => void finish()} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 && (
          <>
            <ThemedText variant="title" accessibilityRole="header">
              {t('welcome.introTitle')}
            </ThemedText>
            <ThemedText variant="muted">{t('welcome.introBody')}</ThemedText>
            {POINTS.map(([icon, key]) => (
              <View key={key} style={styles.point}>
                <Ionicons name={icon} size={26} color={c.primary} />
                <ThemedText style={styles.flex}>{t(`welcome.introPoints.${key}`)}</ThemedText>
              </View>
            ))}
          </>
        )}
        {step === 1 && (
          <>
            <ThemedText variant="title" accessibilityRole="header">
              {t('welcome.dietTitle')}
            </ThemedText>
            <ThemedText variant="muted">{t('welcome.dietBody')}</ThemedText>
            <DietChips settings={settings} onChange={(p) => void update(p)} />
            <ThemedText variant="subtitle">{t('welcome.allergiesTitle')}</ThemedText>
            <AllergenChips settings={settings} onChange={(p) => void update(p)} />
          </>
        )}
        {step === 2 && (
          <>
            <ThemedText variant="title" accessibilityRole="header">
              {t('welcome.kitchenTitle')}
            </ThemedText>
            <ThemedText variant="muted">{t('welcome.kitchenBody')}</ThemedText>
            <EquipmentChips settings={settings} onChange={(p) => void update(p)} />
            <ThemedText variant="subtitle">{t('welcome.pantryTitle')}</ThemedText>
            <PantryChips settings={settings} onChange={(p) => void update(p)} />
          </>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label={last ? t('welcome.start') : t('welcome.next')}
          icon={last ? 'checkmark' : 'arrow-forward'}
          onPress={() => (last ? void finish() : setStep((s) => s + 1))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  content: { padding: spacing.lg, gap: spacing.md },
  point: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  footer: { paddingHorizontal: spacing.lg },
});
