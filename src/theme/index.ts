import { useColorScheme } from 'react-native';

import { palette, type ThemeColors } from './colors';

export { palette, type ColorScheme, type ThemeColors } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

// Área táctil mínima recomendada por Apple y Google.
export const MIN_TOUCH = 44;

export function useThemeColors(): ThemeColors {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
