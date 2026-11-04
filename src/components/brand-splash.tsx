// Pantalla de bienvenida con el logo: se ve 1 segundo al abrir la app y se desvanece.
// La pantalla de carga nativa se mantiene hasta que este logo aparece, así no hay un parpadeo.

import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { APP_CONFIG } from '@/config/app';
import { t } from '@/i18n';
import { spacing, useThemeColors } from '@/theme';

/** Cuánto se ve el logo antes de desvanecerse. */
export const BRAND_SPLASH_MS = 1000;

const LOGO = require('../../assets/images/splash-icon.png') as number;

export function BrandSplash() {
  const c = useThemeColors();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), BRAND_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }
  return (
    <Animated.View
      exiting={FadeOut.duration(350)}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={() => void SplashScreen.hideAsync().catch(() => {})}
      style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: c.background }]}>
      <Animated.View entering={FadeIn.duration(250)} style={styles.center}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <ThemedText style={[styles.name, { color: c.primary }]}>{APP_CONFIG.name}</ThemedText>
        <View style={styles.gap} />
        <ThemedText variant="muted">{t('splash.tagline')}</ThemedText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 112, height: 112 },
  name: { fontSize: 36, lineHeight: 44, fontWeight: '800', marginTop: spacing.md },
  gap: { height: spacing.xs },
});
