import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Chip, ChipRow } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useDb } from '@/db/provider';
import { saveSettings, type Settings } from '@/db/settings-repo';
import { allCategories, getCatalogProduct } from '@/features/catalog/catalog';
import { notifySettingsChanged, useSettings } from '@/features/inventory/store';
import {
  hasNotificationPermission,
  requestNotificationPermission,
} from '@/features/notifications/scheduler';
import { t, tn } from '@/i18n';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

const PANTRY_OPTIONS = [
  'sal',
  'aceite',
  'azucar',
  'harina',
  'ajo',
  'cebolla',
  'arroz',
  'fideos',
  'huevos',
  'caldo',
];

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useThemeColors();
  return (
    <View style={styles.section}>
      <ThemedText variant="subtitle" accessibilityRole="header">
        {title}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: c.surface }]}>{children}</View>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const c = useThemeColors();
  return (
    <View style={styles.toggleRow}>
      <ThemedText style={styles.flex}>{label}</ThemedText>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: c.primary, false: c.border }}
      />
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: 'add' | 'remove';
  label: string;
  onPress: () => void;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.iconButton, { backgroundColor: c.surfaceAlt }]}>
      <Ionicons name={icon} size={24} color={c.text} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const c = useThemeColors();
  const db = useDb();
  const { data: settings } = useSettings();
  const [permission, setPermission] = useState<boolean | null>(null);

  useEffect(() => {
    hasNotificationPermission()
      .then(setPermission)
      .catch(() => setPermission(false));
  }, []);

  if (!settings) {
    return <View style={[styles.flex, { backgroundColor: c.background }]} />;
  }

  const update = async (patch: Partial<Settings>) => {
    await saveSettings(db, patch);
    notifySettingsChanged();
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (enabled && !permission) {
      const granted = await requestNotificationPermission().catch(() => false);
      setPermission(granted);
    }
    await update({ notificationsEnabled: enabled, notificationPromptAnswered: true });
  };

  const summaryMinutes = settings.summaryHour * 60 + settings.summaryMinute;
  const shiftSummary = (delta: number) => {
    const next = Math.min(21 * 60 + 30, Math.max(8 * 60, summaryMinutes + delta));
    void update({ summaryHour: Math.floor(next / 60), summaryMinute: next % 60 });
  };

  const toggleInList = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const alertCategories = allCategories().filter((cat) => cat.id !== 'otros');
  const version = Constants.expoConfig?.version ?? '';

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Section title={t('settings.notificationsSection')}>
        <ToggleRow
          label={t('settings.notificationsEnabled')}
          value={settings.notificationsEnabled}
          onChange={(v) => void toggleNotifications(v)}
        />
        {permission === false && settings.notificationsEnabled && (
          <ThemedText style={{ color: c.dangerFg }}>{t('settings.permissionDenied')}</ThemedText>
        )}
        <View style={styles.block}>
          <ThemedText>{t('settings.summaryTime')}</ThemedText>
          <View style={styles.timeRow}>
            <IconButton
              icon="remove"
              label={t('settings.earlier')}
              onPress={() => shiftSummary(-30)}
            />
            <ThemedText style={styles.time} accessibilityLiveRegion="polite">
              {formatTime(summaryMinutes)}
            </ThemedText>
            <IconButton icon="add" label={t('settings.later')} onPress={() => shiftSummary(30)} />
          </View>
        </View>
        <View style={styles.block}>
          <ThemedText>{t('settings.daysAhead')}</ThemedText>
          <ChipRow>
            {([1, 2, 3] as const).map((days) => (
              <Chip
                key={days}
                label={tn('settings.daysAheadOption', days)}
                selected={settings.daysAhead === days}
                onPress={() => void update({ daysAhead: days })}
              />
            ))}
          </ChipRow>
        </View>
        <ToggleRow
          label={t('settings.morningAlert')}
          value={settings.morningAlert}
          onChange={(v) => void update({ morningAlert: v })}
        />
        <ToggleRow
          label={t('settings.longLifeAlerts')}
          value={settings.longLifeAlerts}
          onChange={(v) => void update({ longLifeAlerts: v })}
        />
        <View style={styles.block}>
          <ThemedText>
            {t('settings.quietHours', {
              from: formatTime(settings.quietStart),
              to: formatTime(settings.quietEnd),
            })}
          </ThemedText>
          <ChipRow>
            {[21, 22, 23].map((hour) => (
              <Chip
                key={`start-${hour}`}
                label={t('settings.quietFrom', { time: formatTime(hour * 60) })}
                selected={settings.quietStart === hour * 60}
                onPress={() => void update({ quietStart: hour * 60 })}
              />
            ))}
          </ChipRow>
          <ChipRow>
            {[7, 8, 9].map((hour) => (
              <Chip
                key={`end-${hour}`}
                label={t('settings.quietTo', { time: formatTime(hour * 60) })}
                selected={settings.quietEnd === hour * 60}
                onPress={() => void update({ quietEnd: hour * 60 })}
              />
            ))}
          </ChipRow>
        </View>
      </Section>

      <Section title={t('settings.categoriesSection')}>
        <ChipRow>
          {alertCategories.map((cat) => (
            <Chip
              key={cat.id}
              label={`${cat.emoji} ${cat.name}`}
              selected={!settings.mutedCategories.includes(cat.id)}
              onPress={() =>
                void update({ mutedCategories: toggleInList(settings.mutedCategories, cat.id) })
              }
            />
          ))}
        </ChipRow>
      </Section>

      <Section title={t('settings.pantrySection')}>
        <ThemedText variant="muted" style={styles.small}>
          {t('settings.pantryHint')}
        </ThemedText>
        <ChipRow>
          {PANTRY_OPTIONS.map((id) => {
            const product = getCatalogProduct(id);
            return product ? (
              <Chip
                key={id}
                label={`${product.emoji} ${product.name}`}
                selected={settings.pantryBasics.includes(id)}
                onPress={() =>
                  void update({ pantryBasics: toggleInList(settings.pantryBasics, id) })
                }
              />
            ) : null;
          })}
        </ChipRow>
      </Section>

      <Section title={t('settings.aboutSection')}>
        <ThemedText style={styles.small}>{t('settings.aboutBody')}</ThemedText>
        <ThemedText style={styles.small}>{t('settings.offCredit')}</ThemedText>
        <ThemedText variant="muted" style={styles.small}>
          {t('settings.version', { version })}
        </ThemedText>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  section: { gap: spacing.sm },
  card: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  block: { gap: spacing.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  iconButton: {
    width: MIN_TOUCH + 8,
    height: MIN_TOUCH + 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { fontSize: 24, fontWeight: '700', minWidth: 80, textAlign: 'center' },
  small: { fontSize: 14, lineHeight: 20 },
});
