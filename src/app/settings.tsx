import { EmptyState } from '@/components/empty-state';
import { t } from '@/i18n';

export default function SettingsScreen() {
  return (
    <EmptyState
      icon="settings-outline"
      title={t('settings.title')}
      body={t('settings.comingSoon')}
    />
  );
}
