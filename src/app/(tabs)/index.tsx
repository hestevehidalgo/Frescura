import { EmptyState } from '@/components/empty-state';
import { t } from '@/i18n';

export default function HomeScreen() {
  return (
    <EmptyState icon="basket-outline" title={t('home.emptyTitle')} body={t('home.emptyBody')} />
  );
}
