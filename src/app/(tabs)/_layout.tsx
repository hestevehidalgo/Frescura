import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function SettingsButton() {
  const colors = useThemeColors();
  return (
    <Link href="/settings" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings.open')}
        hitSlop={8}
        style={styles.headerButton}>
        <Ionicons name="settings-outline" size={24} color={colors.text} />
      </Pressable>
    </Link>
  );
}

function tabIcon(outline: IconName, filled: IconName) {
  function TabIcon({ focused }: { focused: boolean }) {
    const colors = useThemeColors();
    return (
      <Ionicons
        name={focused ? filled : outline}
        size={24}
        color={focused ? colors.primary : colors.tabInactive}
      />
    );
  }
  return TabIcon;
}

// Escanear lleva un círculo verde del mismo tamaño que los otros íconos, para distinguirlo sin
// que domine la barra.
function ScanIcon({ focused }: { focused: boolean }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.scanBubble, { backgroundColor: colors.primary }]}>
      <Ionicons name={focused ? 'scan' : 'scan-outline'} size={16} color={colors.onPrimary} />
    </View>
  );
}

// Al abrir la app se parte en Inicio, aunque Escanear vaya primero en la barra.
export const unstable_settings = { initialRouteName: 'index' };

export default function TabsLayout() {
  const colors = useThemeColors();
  return (
    <Tabs
      screenOptions={{
        headerRight: () => <SettingsButton />,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        // Tamaño de etiqueta por defecto: el alto estándar de la barra (49 pt) no admite más.
        tabBarLabelStyle: { fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="scan"
        options={{
          title: t('tabs.scan'),
          tabBarIcon: ScanIcon,
          tabBarActiveTintColor: colors.primary,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: t('tabs.recipes'),
          tabBarIcon: tabIcon('restaurant-outline', 'restaurant'),
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: t('tabs.summary'),
          tabBarIcon: tabIcon('stats-chart-outline', 'stats-chart'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  scanBubble: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
