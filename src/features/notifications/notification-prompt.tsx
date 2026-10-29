import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { useDb } from '@/db/provider';
import { saveSettings } from '@/db/settings-repo';
import { notifySettingsChanged, useSettings } from '@/features/inventory/store';
import { t } from '@/i18n';
import { spacing } from '@/theme';

import { requestNotificationPermission } from './scheduler';

/**
 * Pide permiso para avisar en contexto: después de guardar el primer producto, nunca al abrir la
 * app por primera vez.
 */
export function NotificationPrompt({ hasItems }: { hasItems: boolean }) {
  const db = useDb();
  const { data: settings } = useSettings();
  const visible = hasItems && settings !== undefined && !settings.notificationPromptAnswered;

  const answer = async (wants: boolean) => {
    if (wants) {
      await requestNotificationPermission().catch(() => false);
    }
    await saveSettings(db, { notificationPromptAnswered: true, notificationsEnabled: wants });
    notifySettingsChanged();
  };

  return (
    <Sheet
      visible={visible}
      onClose={() => void answer(false)}
      title={t('notifications.promptTitle')}>
      <ThemedText variant="muted">{t('notifications.promptBody')}</ThemedText>
      <View style={styles.buttons}>
        <Button
          label={t('notifications.promptYes')}
          icon="notifications"
          onPress={() => void answer(true)}
        />
        <Button
          variant="ghost"
          label={t('notifications.promptNo')}
          onPress={() => void answer(false)}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  buttons: { gap: spacing.sm, marginTop: spacing.sm },
});
