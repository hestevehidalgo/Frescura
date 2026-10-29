import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { t } from '@/i18n';
import { radius, spacing, useThemeColors } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

/** Panel que sube desde abajo. Se cierra tocando afuera o con el gesto de volver. */
export function Sheet({ visible, onClose, title, subtitle, children }: Props) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: c.overlay }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <View
          style={[
            styles.panel,
            { backgroundColor: c.surface, paddingBottom: insets.bottom + spacing.md },
          ]}
          accessibilityViewIsModal>
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          {title && (
            <ThemedText variant="subtitle" accessibilityRole="header" style={styles.title}>
              {title}
            </ThemedText>
          )}
          {subtitle && (
            <ThemedText variant="muted" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          )}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: StyleSheet.absoluteFill,
  panel: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    maxHeight: '85%',
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: spacing.md },
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.sm },
  content: { gap: spacing.sm, paddingBottom: spacing.sm },
});
