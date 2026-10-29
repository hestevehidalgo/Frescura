import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, ChipRow } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { t, type MessageKey } from '@/i18n';
import { addDays, formatDate, type IsoDate } from '@/lib/dates';
import { parsePackageDate } from '@/lib/package-date';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

const QUICK: [MessageKey, number][] = [
  ['actions.quickDates.today', 0],
  ['actions.quickDates.tomorrow', 1],
  ['actions.quickDates.in3', 3],
  ['actions.quickDates.in7', 7],
  ['actions.quickDates.in14', 14],
  ['actions.quickDates.in30', 30],
];

type Props = {
  today: IsoDate;
  /** Fecha elegida con un toque (la pone el usuario) o escrita desde el envase. */
  onPick: (date: IsoDate, source: 'user' | 'printed') => void;
};

/** Elegir una fecha con un toque, o escribirla como aparece en el envase. */
export function ExpiryDatePicker({ today, onPick }: Props) {
  const c = useThemeColors();
  const [text, setText] = useState('');
  const parsed = text.trim() ? parsePackageDate(text, today) : null;

  return (
    <View style={styles.container}>
      <ChipRow>
        {QUICK.map(([label, days]) => (
          <Chip key={label} label={t(label)} onPress={() => onPick(addDays(today, days), 'user')} />
        ))}
      </ChipRow>
      <ThemedText variant="muted">{t('actions.typeDate')}</ThemedText>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t('actions.typeDatePlaceholder')}
        placeholderTextColor={c.textMuted}
        keyboardType="numbers-and-punctuation"
        autoCorrect={false}
        accessibilityLabel={t('actions.typeDate')}
        style={[
          styles.input,
          { color: c.text, borderColor: c.border, backgroundColor: c.background },
        ]}
      />
      {text.trim() !== '' && (
        <ThemedText style={{ color: parsed ? c.okFg : c.dangerFg }}>
          {parsed
            ? t('actions.dateRecognized', { date: formatDate(parsed.date) })
            : t('actions.dateNotRecognized')}
        </ThemedText>
      )}
      {parsed && (
        <Button
          label={t('actions.usePrintedDate')}
          icon="checkmark"
          onPress={() => onPick(parsed.date, 'printed')}
        />
      )}
      <ThemedText variant="muted" style={styles.hint}>
        {t('actions.scanDateSoon')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  input: {
    minHeight: MIN_TOUCH + 4,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 18,
  },
  hint: { fontSize: 14 },
});
