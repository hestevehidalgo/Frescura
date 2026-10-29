import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  accessibilityHint,
  style,
}: ButtonProps) {
  const c = useThemeColors();
  const background = {
    primary: c.primary,
    secondary: c.surfaceAlt,
    danger: c.dangerBg,
    ghost: 'transparent',
  }[variant];
  const foreground = {
    primary: c.onPrimary,
    secondary: c.text,
    danger: c.dangerFg,
    ghost: c.primary,
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {icon && <Ionicons name={icon} size={20} color={foreground} />}
      <ThemedText style={[styles.label, { color: foreground }]}>{label}</ThemedText>
    </Pressable>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  accessibilityLabel?: string;
};

export function Chip({ label, selected, onPress, icon, accessibilityLabel }: ChipProps) {
  const c = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? c.primary : c.surface,
          borderColor: selected ? c.primary : c.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      {icon && <Ionicons name={icon} size={16} color={selected ? c.onPrimary : c.text} />}
      <ThemedText style={[styles.chipLabel, { color: selected ? c.onPrimary : c.text }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Fila de chips que se ajusta a varias líneas. */
export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH + 4,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: { fontSize: 16, fontWeight: '600' },
  chip: {
    minHeight: MIN_TOUCH - 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chipLabel: { fontSize: 15, fontWeight: '500' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
