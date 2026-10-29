import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { UndoToastProvider } from '@/components/undo-toast';
import { DbProvider } from '@/db/provider';
import { useNotificationSync } from '@/features/notifications/use-notifications';
import { t } from '@/i18n';
import { palette } from '@/theme';

function navigationTheme(scheme: 'light' | 'dark'): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = palette[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.accent,
    },
  };
}

/** Componente sin interfaz que mantiene los avisos programados al día. */
function NotificationSync() {
  useNotificationSync();
  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemeProvider value={navigationTheme(scheme)}>
        <DbProvider>
          <UndoToastProvider>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <NotificationSync />
            <Stack screenOptions={{ headerBackTitle: t('common.back') }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="settings"
                options={{ title: t('settings.title'), presentation: 'modal' }}
              />
              <Stack.Screen name="add" options={{ title: t('add.title'), presentation: 'modal' }} />
              <Stack.Screen name="item/[id]" options={{ title: t('detail.title') }} />
              <Stack.Screen
                name="edit/[id]"
                options={{ title: t('edit.title'), presentation: 'modal' }}
              />
              <Stack.Screen
                name="barcode"
                options={{ title: t('barcode.title'), presentation: 'modal' }}
              />
            </Stack>
          </UndoToastProvider>
        </DbProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
