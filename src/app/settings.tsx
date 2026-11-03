import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button, Chip, ChipRow } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/undo-toast';
import { parseBackup, restoreBackup, type Backup } from '@/db/backup';
import { useDb } from '@/db/provider';
import { saveSettings, type Settings } from '@/db/settings-repo';
import { allCategories } from '@/features/catalog/catalog';
import { BACKUP_SUPPORTED, pickBackupText, shareBackup } from '@/features/backup/backup-file';
import {
  notifyInventoryChanged,
  notifyRecipesChanged,
  notifySettingsChanged,
  useSettings,
  useToday,
} from '@/features/inventory/store';
import {
  hasNotificationPermission,
  requestNotificationPermission,
} from '@/features/notifications/scheduler';
import { WEEKDAY_KEYS } from '@/features/notifications/planner';
import {
  AllergenChips,
  DietChips,
  EquipmentChips,
  PantryChips,
} from '@/features/recipes/components/preference-chips';
import { t, tn } from '@/i18n';
import { capitalize } from '@/lib/text';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

// La semana parte el lunes.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

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
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const today = useToday();

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
    const next = Math.min(21 * 60 + 30, Math.max(7 * 60, summaryMinutes + delta));
    void update({ summaryHour: Math.floor(next / 60), summaryMinute: next % 60 });
  };

  const toggleInList = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const quota = settings.aiQuota?.month === today.slice(0, 7) ? settings.aiQuota : null;

  const exportData = async () => {
    setBusy(true);
    try {
      if (!(await shareBackup(db))) {
        toast(t('settings.backupError'));
      }
    } catch {
      toast(t('settings.backupError'));
    }
    setBusy(false);
  };

  const restore = async (backup: Backup) => {
    setBusy(true);
    try {
      const { items } = await restoreBackup(db, backup);
      notifyInventoryChanged();
      notifySettingsChanged();
      notifyRecipesChanged();
      toast(tn('settings.importDone', items));
    } catch {
      toast(t('settings.backupError'));
    }
    setBusy(false);
  };

  const importData = async () => {
    let text: string | null;
    try {
      text = await pickBackupText();
    } catch {
      toast(t('settings.backupError'));
      return;
    }
    if (text === null) {
      return;
    }
    const backup = parseBackup(text);
    if ('error' in backup) {
      toast(t(backup.error === 'newer' ? 'settings.importNewer' : 'settings.importInvalid'));
      return;
    }
    Alert.alert(t('settings.importTitle'), t('settings.importBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.importConfirm'),
        style: 'destructive',
        onPress: () => void restore(backup),
      },
    ]);
  };

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
        <ThemedText variant="muted" style={styles.small}>
          {t('settings.notificationsHint')}
        </ThemedText>
        <View style={styles.block}>
          <ThemedText>{t('settings.summaryDay')}</ThemedText>
          <ChipRow>
            {WEEKDAY_ORDER.map((weekday) => (
              <Chip
                key={weekday}
                label={capitalize(t(WEEKDAY_KEYS[weekday] ?? 'weekdays.sun'))}
                selected={settings.summaryWeekday === weekday}
                onPress={() => void update({ summaryWeekday: weekday })}
              />
            ))}
          </ChipRow>
        </View>
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

      <Section title={t('settings.kitchenSection')}>
        <ThemedText style={styles.label}>{t('settings.dietLabel')}</ThemedText>
        <DietChips settings={settings} onChange={(p) => void update(p)} />
        <ThemedText style={styles.label}>{t('settings.avoidLabel')}</ThemedText>
        <AllergenChips settings={settings} onChange={(p) => void update(p)} />
        <ThemedText style={styles.label}>{t('settings.equipmentLabel')}</ThemedText>
        <EquipmentChips settings={settings} onChange={(p) => void update(p)} />
        <ThemedText style={styles.label}>{t('settings.pantrySection')}</ThemedText>
        <ThemedText variant="muted" style={styles.small}>
          {t('settings.pantryHint')}
        </ThemedText>
        <PantryChips settings={settings} onChange={(p) => void update(p)} />
      </Section>

      <Section title={t('settings.dataSection')}>
        <ThemedText style={styles.small}>{t('settings.privacy')}</ThemedText>
        {quota?.scansLeft != null && (
          <ThemedText style={styles.small}>{tn('settings.quotaScans', quota.scansLeft)}</ThemedText>
        )}
        {quota?.recipesLeft != null && (
          <ThemedText style={styles.small}>
            {tn('settings.quotaRecipes', quota.recipesLeft)}
          </ThemedText>
        )}
        {BACKUP_SUPPORTED ? (
          <>
            <ThemedText variant="muted" style={styles.small}>
              {t('settings.backupHint')}
            </ThemedText>
            <Button
              icon="share-outline"
              variant="secondary"
              label={t('settings.exportBackup')}
              disabled={busy}
              onPress={() => void exportData()}
            />
            <Button
              icon="download-outline"
              variant="secondary"
              label={t('settings.importBackup')}
              disabled={busy}
              onPress={() => void importData()}
            />
          </>
        ) : (
          <ThemedText variant="muted" style={styles.small}>
            {t('settings.backupWebOnly')}
          </ThemedText>
        )}
      </Section>

      <Section title={t('settings.aboutSection')}>
        <ThemedText style={styles.small}>{t('settings.aboutBody')}</ThemedText>
        <ThemedText style={styles.small}>{t('settings.offCredit')}</ThemedText>
        <ThemedText style={styles.small}>{t('settings.recipesCredit')}</ThemedText>
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
  label: { fontWeight: '600' },
});
