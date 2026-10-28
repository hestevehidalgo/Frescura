import { EmptyState } from '@/components/empty-state';
import { t } from '@/i18n';

export default function ScanScreen() {
  return (
    <EmptyState icon="receipt-outline" title={t('scan.emptyTitle')} body={t('scan.emptyBody')} />
  );
}
