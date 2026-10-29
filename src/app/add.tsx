import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, ChipRow } from '@/components/button';
import { QuantityStepper } from '@/components/quantity-stepper';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/undo-toast';
import { removeItems } from '@/db/inventory-repo';
import { createCustomProduct, searchCustomProducts } from '@/db/products-repo';
import { useDb } from '@/db/provider';
import {
  allCategories,
  getCatalogProduct,
  LOCATIONS,
  quickProducts,
  searchCatalog,
  type Location,
  type Product,
} from '@/features/catalog/catalog';
import { LOCATION_ICON } from '@/features/inventory/components/action-sheet';
import { addToInventory } from '@/features/inventory/service';
import { notifyInventoryChanged, useToday } from '@/features/inventory/store';
import { t, tn } from '@/i18n';
import { addDays } from '@/lib/dates';
import { parseClp } from '@/lib/money';
import { formatQuantity } from '@/lib/quantity';
import { capitalize } from '@/lib/text';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

type Entry = {
  key: string;
  product: Product;
  displayName: string;
  quantity: number;
  location: Location;
  ripe: boolean | null;
  priceClp: number | null;
};

let keySequence = 0;
function nextKey(productId: string): string {
  keySequence += 1;
  return `${productId}-${keySequence}`;
}

function defaultQuantity(product: Product): number {
  return product.unit === 'un' || product.unit === 'kg' || product.unit === 'l' ? 1 : 500;
}

export default function AddScreen() {
  const c = useThemeColors();
  const db = useDb();
  const router = useRouter();
  const toast = useToast();
  const today = useToday();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState<Product[]>([]);
  const [basket, setBasket] = useState<Entry[]>([]);
  const [daysAgo, setDaysAgo] = useState(0);
  const [quantityFor, setQuantityFor] = useState<Entry | null>(null);
  const [priceText, setPriceText] = useState('');
  const [categoryFor, setCategoryFor] = useState<string | null>(null);
  const [leftoversOpen, setLeftoversOpen] = useState(false);
  const [leftoversName, setLeftoversName] = useState('');
  const [saving, setSaving] = useState(false);
  // Alto del panel "Para guardar", para que nunca tape la grilla.
  const [basketHeight, setBasketHeight] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (query.trim().length < 2) {
      return;
    }
    searchCustomProducts(db, query)
      .then((found) => !cancelled && setCustom(found))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [db, query]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }
    return [...(query.trim().length >= 2 ? custom : []), ...searchCatalog(query, 6)];
  }, [custom, query]);

  const countFor = (productId: string) =>
    basket.filter((e) => e.product.id === productId).reduce((sum, e) => sum + e.quantity, 0);

  const addEntry = (product: Product, displayName = product.name, quantity?: number) => {
    void Haptics.selectionAsync();
    setBasket((prev) => {
      const existing = prev.find(
        (e) => e.product.id === product.id && e.displayName === displayName,
      );
      const step = quantity ?? defaultQuantity(product);
      if (existing) {
        return prev.map((e) => (e === existing ? { ...e, quantity: e.quantity + step } : e));
      }
      return [
        ...prev,
        {
          key: nextKey(product.id),
          product,
          displayName,
          quantity: step,
          location: product.storage,
          ripe: null,
          priceClp: null,
        },
      ];
    });
  };

  const updateEntry = (key: string, patch: Partial<Entry>) =>
    setBasket((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  const openQuantity = (product: Product) => {
    let entry = basket.find((e) => e.product.id === product.id);
    if (!entry) {
      entry = {
        key: nextKey(product.id),
        product,
        displayName: product.name,
        quantity: defaultQuantity(product),
        location: product.storage,
        ripe: null,
        priceClp: null,
      };
      setBasket((prev) => [...prev, entry as Entry]);
    }
    setPriceText(entry.priceClp ? String(entry.priceClp) : '');
    setQuantityFor(entry);
  };

  const save = async () => {
    setSaving(true);
    const purchasedAt = addDays(today, -daysAgo);
    const ids: string[] = [];
    try {
      for (const entry of basket) {
        const item = await addToInventory(db, {
          product: entry.product,
          displayName: entry.displayName,
          quantity: entry.quantity,
          location: entry.location,
          purchasedAt,
          ripe: entry.ripe ?? undefined,
          priceClp: entry.priceClp,
        });
        ids.push(item.id);
      }
      notifyInventoryChanged();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(tn('toasts.added', ids.length), async () => {
        await removeItems(db, ids);
        notifyInventoryChanged();
      });
      router.back();
    } catch {
      if (ids.length) {
        await removeItems(db, ids).catch(() => {});
      }
      toast(t('toasts.error'));
      setSaving(false);
    }
  };

  const sobras = getCatalogProduct('sobras');

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: (basket.length > 0 ? basketHeight : 0) + insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="search" size={18} color={c.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('add.searchPlaceholder')}
            placeholderTextColor={c.textMuted}
            accessibilityLabel={t('add.searchPlaceholder')}
            autoCorrect={false}
            style={[styles.searchInput, { color: c.text }]}
          />
        </View>

        {query.trim() !== '' && (
          <View style={[styles.results, { backgroundColor: c.surface }]}>
            {results.map((product) => (
              <Pressable
                key={product.id}
                accessibilityRole="button"
                onPress={() => {
                  addEntry(product);
                  setQuery('');
                }}
                style={styles.resultRow}>
                <ThemedText style={styles.resultEmoji}>{product.emoji}</ThemedText>
                <ThemedText style={styles.flex}>{product.name}</ThemedText>
                <Ionicons name="add-circle" size={24} color={c.primary} />
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setCategoryFor(capitalize(query.trim()))}
              style={styles.resultRow}>
              <Ionicons name="create-outline" size={22} color={c.primary} />
              <ThemedText style={[styles.flex, { color: c.primary }]}>
                {t('add.addCustom', { name: capitalize(query.trim()) })}
              </ThemedText>
            </Pressable>
          </View>
        )}

        <View style={styles.row}>
          <Button
            variant="secondary"
            icon="barcode-outline"
            label={t('add.barcode')}
            onPress={() => router.push('/barcode')}
            style={styles.flex}
          />
          <Button
            variant="secondary"
            icon="file-tray-full-outline"
            label={t('add.leftovers')}
            onPress={() => setLeftoversOpen(true)}
            style={styles.flex}
          />
        </View>

        <View>
          <ThemedText variant="subtitle" accessibilityRole="header">
            {t('add.quickTitle')}
          </ThemedText>
          <ThemedText variant="muted" style={styles.hint}>
            {t('add.quickHint')}
          </ThemedText>
        </View>
        <View style={styles.grid}>
          {quickProducts().map((product) => {
            const count = countFor(product.id);
            return (
              <Pressable
                key={product.id}
                accessibilityRole="button"
                accessibilityLabel={
                  count > 0
                    ? `${product.name}, ${formatQuantity(count, product.unit)}`
                    : product.name
                }
                accessibilityHint={t('add.quickHint')}
                onPress={() => addEntry(product)}
                onLongPress={() => openQuantity(product)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    backgroundColor: count > 0 ? c.okBg : c.surface,
                    borderColor: count > 0 ? c.primary : c.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                <ThemedText style={styles.tileEmoji}>{product.emoji}</ThemedText>
                <ThemedText style={styles.tileName} numberOfLines={2}>
                  {product.name}
                </ThemedText>
                {count > 0 && (
                  <View style={[styles.badge, { backgroundColor: c.primary }]}>
                    <ThemedText style={[styles.badgeText, { color: c.onPrimary }]}>
                      {formatQuantity(count, product.unit).replace(' un', '')}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {basket.length > 0 && (
        <View
          onLayout={(e) => setBasketHeight(e.nativeEvent.layout.height)}
          style={[
            styles.basket,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}>
          <ThemedText style={styles.basketTitle} accessibilityRole="header">
            {t('add.basketTitle')}
          </ThemedText>
          <ScrollView style={styles.basketList} nestedScrollEnabled>
            {basket.map((entry) => (
              <View key={entry.key} style={styles.basketEntry}>
                <View style={styles.basketRow}>
                  <ThemedText style={styles.resultEmoji}>{entry.product.emoji}</ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setPriceText(entry.priceClp ? String(entry.priceClp) : '');
                      setQuantityFor(entry);
                    }}
                    style={styles.flex}>
                    <ThemedText style={styles.basketName} numberOfLines={1}>
                      {entry.displayName} · {formatQuantity(entry.quantity, entry.product.unit)}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('add.remove', { name: entry.displayName })}
                    onPress={() => setBasket((prev) => prev.filter((e) => e.key !== entry.key))}
                    hitSlop={8}
                    style={styles.remove}>
                    <Ionicons name="close-circle" size={24} color={c.textMuted} />
                  </Pressable>
                </View>
                <View style={styles.basketChips}>
                  <Chip
                    icon={LOCATION_ICON[entry.location]}
                    label={t(`locations.${entry.location}`)}
                    accessibilityLabel={`${t('actions.changeLocation')}: ${t(`locations.${entry.location}`)}`}
                    onPress={() => {
                      const next =
                        LOCATIONS[(LOCATIONS.indexOf(entry.location) + 1) % LOCATIONS.length];
                      updateEntry(entry.key, { location: next ?? entry.location });
                    }}
                  />
                  {entry.product.ripeness && (
                    <Chip
                      label={`${t('add.ripeQuestion')} ${entry.ripe ? t('common.yes') : t('common.no')}`}
                      selected={entry.ripe === true}
                      onPress={() => updateEntry(entry.key, { ripe: !entry.ripe })}
                    />
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.purchasedRow}>
            <ThemedText variant="muted">{t('add.purchasedOn')}</ThemedText>
            <ChipRow>
              <Chip
                label={t('add.purchased.today')}
                selected={daysAgo === 0}
                onPress={() => setDaysAgo(0)}
              />
              <Chip
                label={t('add.purchased.yesterday')}
                selected={daysAgo === 1}
                onPress={() => setDaysAgo(1)}
              />
              <Chip
                label={t('add.purchased.twoDaysAgo')}
                selected={daysAgo === 2}
                onPress={() => setDaysAgo(2)}
              />
            </ChipRow>
          </View>
          <Button
            label={tn('add.save', basket.length)}
            icon="checkmark"
            disabled={saving}
            onPress={save}
          />
        </View>
      )}

      {quantityFor && (
        <Sheet
          visible
          onClose={() => setQuantityFor(null)}
          title={t('add.quantityTitle', { name: quantityFor.displayName.toLowerCase() })}>
          <QuantityStepper
            value={basket.find((e) => e.key === quantityFor.key)?.quantity ?? quantityFor.quantity}
            unit={quantityFor.product.unit}
            onChange={(quantity) => updateEntry(quantityFor.key, { quantity })}
          />
          <ThemedText variant="muted">{t('add.price')}</ThemedText>
          <TextInput
            value={priceText}
            onChangeText={setPriceText}
            placeholder={t('edit.pricePlaceholder')}
            placeholderTextColor={c.textMuted}
            keyboardType="number-pad"
            accessibilityLabel={t('add.price')}
            style={[
              styles.input,
              { color: c.text, borderColor: c.border, backgroundColor: c.background },
            ]}
          />
          <Button
            label={t('common.save')}
            onPress={() => {
              updateEntry(quantityFor.key, { priceClp: parseClp(priceText) });
              setQuantityFor(null);
            }}
          />
        </Sheet>
      )}

      <Sheet
        visible={categoryFor !== null}
        onClose={() => setCategoryFor(null)}
        title={t('add.chooseCategory')}
        subtitle={categoryFor ?? undefined}>
        <ChipRow>
          {allCategories().map((category) => (
            <Chip
              key={category.id}
              label={`${category.emoji} ${category.name}`}
              onPress={async () => {
                const name = categoryFor;
                setCategoryFor(null);
                if (!name) {
                  return;
                }
                const product = await createCustomProduct(db, {
                  name,
                  categoryId: category.id,
                  unit: 'un',
                });
                addEntry(product);
                setQuery('');
              }}
            />
          ))}
        </ChipRow>
      </Sheet>

      <Sheet
        visible={leftoversOpen}
        onClose={() => setLeftoversOpen(false)}
        title={t('add.leftoversQuestion')}>
        <TextInput
          value={leftoversName}
          onChangeText={setLeftoversName}
          placeholder={t('add.leftoversPlaceholder')}
          placeholderTextColor={c.textMuted}
          accessibilityLabel={t('add.leftoversQuestion')}
          autoFocus
          style={[
            styles.input,
            { color: c.text, borderColor: c.border, backgroundColor: c.background },
          ]}
        />
        <Button
          label={t('common.save')}
          disabled={!leftoversName.trim() || !sobras}
          onPress={() => {
            if (sobras) {
              addEntry(
                sobras,
                t('add.leftoversName', { name: leftoversName.trim().toLowerCase() }),
                1,
              );
            }
            setLeftoversName('');
            setLeftoversOpen(false);
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH + 4,
  },
  searchInput: { flex: 1, fontSize: 17, minHeight: MIN_TOUCH },
  results: { borderRadius: radius.md, overflow: 'hidden' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH + 4,
    paddingHorizontal: spacing.md,
  },
  resultEmoji: { fontSize: 22, lineHeight: 28 },
  row: { flexDirection: 'row', gap: spacing.sm },
  hint: { fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '23%',
    minWidth: 76,
    aspectRatio: 0.95,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  tileEmoji: { fontSize: 30, lineHeight: 38 },
  tileName: { fontSize: 13, lineHeight: 16, textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 13, fontWeight: '700', lineHeight: 16 },
  basket: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  basketTitle: { fontWeight: '700' },
  basketList: { maxHeight: 180 },
  basketEntry: { paddingVertical: spacing.xs, gap: spacing.xs },
  basketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH - 8,
  },
  basketChips: { flexDirection: 'row', gap: spacing.sm, marginLeft: 36 },
  basketName: { fontSize: 16, fontWeight: '600' },
  remove: { minWidth: MIN_TOUCH - 8, alignItems: 'center' },
  purchasedRow: { gap: spacing.xs },
  input: {
    minHeight: MIN_TOUCH + 4,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 17,
  },
});
