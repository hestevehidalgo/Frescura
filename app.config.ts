import type { ExpoConfig } from 'expo/config';

import { APP_CONFIG } from './src/config/app.ts';

const config: ExpoConfig = {
  name: APP_CONFIG.name,
  slug: APP_CONFIG.slug,
  scheme: APP_CONFIG.scheme,
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: APP_CONFIG.bundleId,
    icon: './assets/expo.icon',
    supportsTablet: true,
  },
  android: {
    package: APP_CONFIG.bundleId,
    adaptiveIcon: {
      backgroundColor: '#FBF7F0',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'expo-camera',
      {
        cameraPermission:
          'Frescura usa la cámara para leer códigos de barras y fechas de vencimiento. Las imágenes no salen de tu celular.',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FBF7F0',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
        dark: { backgroundColor: '#161311' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
