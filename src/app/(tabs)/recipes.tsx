import { EmptyState } from '@/components/empty-state';
import { t } from '@/i18n';

export default function RecipesScreen() {
  return (
    <EmptyState
      icon="restaurant-outline"
      title={t('recipes.emptyTitle')}
      body={t('recipes.emptyBody')}
    />
  );
}
