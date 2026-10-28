import { EmptyState } from '@/components/empty-state';
import { t } from '@/i18n';

export default function SummaryScreen() {
  return (
    <EmptyState
      icon="stats-chart-outline"
      title={t('summary.emptyTitle')}
      body={t('summary.emptyBody')}
    />
  );
}
