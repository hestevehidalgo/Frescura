import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { t } from '@/i18n';
import { spacing, useThemeColors } from '@/theme';

export default function ScanScreen() {
  const c = useThemeColors();
  const router = useRouter();
  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <EmptyState icon="receipt-outline" title={t('scan.emptyTitle')} body={t('scan.emptyBody')} />
      <View style={styles.action}>
        <Button icon="add" label={t('scan.addInstead')} onPress={() => router.push('/add')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  action: { padding: spacing.lg, paddingBottom: spacing.xl },
});
