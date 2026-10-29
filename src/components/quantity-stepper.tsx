import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { t } from '@/i18n';
import { formatQuantity, quantityStep, type Unit } from '@/lib/quantity';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

type Props = {
  value: number;
  unit: Unit;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Botones − y + con la cantidad al medio. Sin escribir. */
export function QuantityStepper({ value, unit, onChange, min, max }: Props) {
  const c = useThemeColors();
  const step = quantityStep(unit);
  const lower = min ?? step;
  const canDecrease = value - step >= lower - 1e-9;
  const canIncrease = max === undefined || value + step <= max + 1e-9;

  const button = (icon: 'remove' | 'add', enabled: boolean, next: number, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => onChange(round(next))}
      style={[styles.button, { backgroundColor: c.surfaceAlt, opacity: enabled ? 1 : 0.4 }]}>
      <Ionicons name={icon} size={24} color={c.text} />
    </Pressable>
  );

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityValue={{ text: formatQuantity(value, unit) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && canIncrease) onChange(round(value + step));
        if (e.nativeEvent.actionName === 'decrement' && canDecrease) onChange(round(value - step));
      }}>
      {button('remove', canDecrease, value - step, t('add.decrease'))}
      <ThemedText style={styles.value}>{formatQuantity(value, unit)}</ThemedText>
      {button('add', canIncrease, value + step, t('add.increase'))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  button: {
    width: MIN_TOUCH + 8,
    height: MIN_TOUCH + 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 22, fontWeight: '700', minWidth: 90, textAlign: 'center' },
});
