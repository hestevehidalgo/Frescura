import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Button, Chip, ChipRow } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import type { InventoryItem } from '@/db/inventory-repo';
import { useItem, useToday } from '@/features/inventory/store';
import { useItemActions } from '@/features/inventory/use-item-actions';
import { t, type MessageKey } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { formatClp, parseClp } from '@/lib/money';
import { parsePackageDate } from '@/lib/package-date';
import { formatDecimal, parseDecimal, UNITS, type Unit } from '@/lib/quantity';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

function Field({
  label,
  error,
  ...input
}: TextInputProps & { label: string; error?: string | null }) {
  const c = useThemeColors();
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        {...input}
        accessibilityLabel={label}
        placeholderTextColor={c.textMuted}
        style={[
          styles.input,
          { color: c.text, backgroundColor: c.surface, borderColor: error ? c.dangerFg : c.border },
        ]}
      />
      {error && <ThemedText style={{ color: c.dangerFg }}>{error}</ThemedText>}
    </View>
  );
}

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const { data } = useItem(id);
  const item = data?.item;
  if (!item) {
    return <View style={[styles.flex, { backgroundColor: c.background }]} />;
  }
  return <EditForm key={item.id} item={item} />;
}

function EditForm({ item }: { item: InventoryItem }) {
  const c = useThemeColors();
  const router = useRouter();
  const today = useToday();
  const { run } = useItemActions();

  const [name, setName] = useState(item.displayName);
  const [quantity, setQuantity] = useState(formatDecimal(item.quantity, 3));
  const [unit, setUnit] = useState<Unit>(item.unit);
  const [price, setPrice] = useState(item.priceClp !== null ? formatClp(item.priceClp) : '');
  const [purchased, setPurchased] = useState(formatDate(item.purchasedAt));
  const [notes, setNotes] = useState(item.notes ?? '');
  const [errors, setErrors] = useState<
    Partial<Record<'quantity' | 'price' | 'purchased', MessageKey>>
  >({});

  const save = async () => {
    const nextErrors: typeof errors = {};
    const parsedQuantity = parseDecimal(quantity);
    if (parsedQuantity === null || parsedQuantity <= 0) {
      nextErrors.quantity = 'edit.invalidQuantity';
    }
    const parsedPrice = price.trim() ? parseClp(price) : null;
    if (price.trim() && parsedPrice === null) {
      nextErrors.price = 'edit.invalidPrice';
    }
    const parsedDate = parsePackageDate(purchased, today)?.date;
    if (!parsedDate) {
      nextErrors.purchased = 'edit.invalidDate';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || parsedQuantity === null || !parsedDate) {
      return;
    }
    const ok = await run(item, {
      type: 'edit',
      fields: {
        displayName: name.trim() || item.displayName,
        quantity: parsedQuantity,
        unit,
        priceClp: parsedPrice,
        purchasedAt: parsedDate,
        notes: notes.trim() || null,
      },
    });
    if (ok) {
      router.back();
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Field label={t('edit.name')} value={name} onChangeText={setName} />
      <Field
        label={t('edit.quantity')}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
        error={errors.quantity ? t(errors.quantity) : null}
      />
      <View style={styles.field}>
        <ThemedText style={styles.label}>{t('edit.unit')}</ThemedText>
        <ChipRow>
          {UNITS.map((u) => (
            <Chip
              key={u}
              label={t(`units.${u}`)}
              selected={unit === u}
              onPress={() => setUnit(u)}
            />
          ))}
        </ChipRow>
      </View>
      <Field
        label={t('edit.price')}
        value={price}
        onChangeText={setPrice}
        placeholder={t('edit.pricePlaceholder')}
        keyboardType="number-pad"
        error={errors.price ? t(errors.price) : null}
      />
      <Field
        label={t('edit.purchasedAt')}
        value={purchased}
        onChangeText={setPurchased}
        placeholder="12/11/26"
        keyboardType="numbers-and-punctuation"
        error={errors.purchased ? t(errors.purchased) : null}
      />
      <Field label={t('edit.notes')} value={notes} onChangeText={setNotes} multiline />
      <Button label={t('common.save')} icon="checkmark" onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  field: { gap: spacing.xs },
  label: { fontWeight: '600' },
  input: {
    minHeight: MIN_TOUCH + 4,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 17,
  },
});
