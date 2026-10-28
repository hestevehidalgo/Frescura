import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColors } from '@/theme';

type Variant = 'body' | 'title' | 'subtitle' | 'muted';

type Props = TextProps & { variant?: Variant };

// Los tamaños escalan con el tamaño de letra del sistema (allowFontScaling por defecto).
export function ThemedText({ variant = 'body', style, ...rest }: Props) {
  const colors = useThemeColors();
  const color = variant === 'muted' ? colors.textMuted : colors.text;
  return <Text style={[styles[variant], { color }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24 },
  muted: { fontSize: 16, lineHeight: 24 },
  subtitle: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
});
