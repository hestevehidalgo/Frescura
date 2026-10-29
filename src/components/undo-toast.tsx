import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { t } from '@/i18n';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

const DURATION_MS = 5000;

type Toast = { id: number; message: string; onUndo?: () => void | Promise<void> };
type ShowToast = (message: string, onUndo?: Toast['onUndo']) => void;

const ToastContext = createContext<ShowToast>(() => {});

/** Aviso abajo de la pantalla, con "Deshacer" durante 5 segundos. */
export function UndoToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const hide = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    setToast(null);
  }, []);

  const show = useCallback<ShowToast>(
    (message, onUndo) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      setToast({ id: Date.now(), message, onUndo });
      AccessibilityInfo.announceForAccessibility(message);
      timer.current = setTimeout(hide, DURATION_MS);
    },
    [hide],
  );

  useEffect(() => () => hide(), [hide]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          key={toast.id}
          entering={FadeInDown.duration(180)}
          exiting={FadeOutDown.duration(180)}
          pointerEvents="box-none"
          style={[styles.wrapper, { bottom: insets.bottom + 70 }]}>
          <View
            style={[styles.toast, { backgroundColor: colors.text }]}
            accessibilityLiveRegion="polite">
            <ThemedText style={[styles.message, { color: colors.background }]} numberOfLines={2}>
              {toast.message}
            </ThemedText>
            {toast.onUndo && (
              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  const undo = toast.onUndo;
                  hide();
                  await undo?.();
                }}
                style={styles.undo}>
                <ThemedText style={[styles.undoText, { color: colors.background }]}>
                  {t('common.undo')}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: spacing.md, right: spacing.md },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    minHeight: MIN_TOUCH + 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  message: { flex: 1, fontSize: 15, paddingVertical: spacing.sm },
  undo: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  undoText: { fontWeight: '700', textDecorationLine: 'underline' },
});
