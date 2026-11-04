import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, ChipRow } from '@/components/button';
import { QuantityStepper } from '@/components/quantity-stepper';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/undo-toast';
import { removeItems } from '@/db/inventory-repo';
import { deleteReceipt, insertReceipt } from '@/db/receipts-repo';
import { saveSettings } from '@/db/settings-repo';
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
import { parseSpokenList } from '@/features/inventory/spoken-list';
import {
  notifyInventoryChanged,
  notifySettingsChanged,
  useSettings,
  useToday,
} from '@/features/inventory/store';
import { STORES } from '@/features/stats/stores';
import { joinList, t, tn } from '@/i18n';
import { addDays } from '@/lib/dates';
import { parsePrice } from '@/lib/money';
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
  /** Precio tal como lo escribe el usuario ("1290" o "$1.290"). */
  priceText: string;
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
  const { height: windowHeight } = useWindowDimensions();
  // En celulares chicos la lista "Para guardar" no debe tapar toda la pantalla.
  const basketListHeight = Math.min(180, Math.round(windowHeight * 0.22));

  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState<Product[]>([]);
  const [basket, setBasket] = useState<Entry[]>([]);
  const [daysAgo, setDaysAgo] = useState(0);
  const [quantityFor, setQuantityFor] = useState<Entry | null>(null);
  const [categoryFor, setCategoryFor] = useState<string | null>(null);
  const [leftoversOpen, setLeftoversOpen] = useState(false);
  const [leftoversName, setLeftoversName] = useState('');
  const [saving, setSaving] = useState(false);
  const { data: settings } = useSettings();
  // undefined = la última tienda usada; null = sin tienda.
  const [storeChoice, setStoreChoice] = useState<string | null | undefined>(undefined);
  const store = storeChoice === undefined ? (settings?.lastStore ?? null) : storeChoice;
  const [storeOpen, setStoreOpen] = useState(false);
  const [otherStore, setOtherStore] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [listText, setListText] = useState('');
  const [listUnknown, setListUnknown] = useState<string[]>([]);
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
          priceText: '',
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
        priceText: '',
      };
      setBasket((prev) => [...prev, entry as Entry]);
    }
    setQuantityFor(entry);
  };

  const badPrices = basket.filter((e) => e.priceText.trim() && parsePrice(e.priceText) === null);

  const save = async () => {
    if (badPrices.length > 0) {
      return;
    }
    setSaving(true);
    const purchasedAt = addDays(today, -daysAgo);
    const ids: string[] = [];
    let receiptId: string | null = null;
    try {
      // La tienda se guarda como una compra sin boleta: así sirve para comparar precios.
      if (store) {
        const receipt = await insertReceipt(db, {
          chain: store,
          issuerRut: null,
          folio: null,
          purchasedAt,
          totalClp: null,
          fingerprint: null,
          imageHash: null,
        });
        receiptId = receipt.id;
      }
      for (const entry of basket) {
        const item = await addToInventory(db, {
          product: entry.product,
          displayName: entry.displayName,
          quantity: entry.quantity,
          location: entry.location,
          purchasedAt,
          ripe: entry.ripe ?? undefined,
          priceClp: parsePrice(entry.priceText),
          receiptId,
        });
        ids.push(item.id);
      }
      if (store !== (settings?.lastStore ?? null)) {
        await saveSettings(db, { lastStore: store });
        notifySettingsChanged();
      }
      notifyInventoryChanged();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const savedReceipt = receiptId;
      toast(tn('toasts.added', ids.length), async () => {
        await removeItems(db, ids);
        if (savedReceipt) {
          await deleteReceipt(db, savedReceipt);
        }
        notifyInventoryChanged();
      });
      router.back();
    } catch {
      if (ids.length) {
        await removeItems(db, ids).catch(() => {});
      }
      if (receiptId) {
        await deleteReceipt(db, receiptId).catch(() => {});
      }
      toast(t('toasts.error'));
      setSaving(false);
    }
  };

  const addList = () => {
    const result = parseSpokenList(listText, defaultQuantity);
    for (const entry of result.entries) {
      addEntry(entry.product, entry.product.name, entry.quantity);
    }
    if (result.unknown.length > 0) {
      setListText(result.unknown.join(', '));
      setListUnknown(result.unknown);
      return;
    }
    setListText('');
    setListUnknown([]);
    setListOpen(false);
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

        <Button
          variant="secondary"
          icon="mic-outline"
          label={t('add.list')}
          onPress={() => setListOpen(true)}
        />

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
          <ScrollView style={{ maxHeight: basketListHeight }} nestedScrollEnabled>
            {basket.map((entry) => (
              <View key={entry.key} style={styles.basketEntry}>
                <View style={styles.basketRow}>
                  <ThemedText style={styles.resultEmoji}>{entry.product.emoji}</ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
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
                  <TextInput
                    value={entry.priceText}
                    onChangeText={(priceText) => updateEntry(entry.key, { priceText })}
                    placeholder={t('add.pricePlaceholder')}
                    placeholderTextColor={c.textMuted}
                    keyboardType="number-pad"
                    accessibilityLabel={t('add.priceOf', { name: entry.displayName })}
                    style={[
                      styles.priceInput,
                      {
                        color: c.text,
                        backgroundColor: c.background,
                        borderColor:
                          entry.priceText && parsePrice(entry.priceText) === null
                            ? c.dangerFg
                            : c.border,
                      },
                    ]}
                  />
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
          <View style={styles.storeRow}>
            <ThemedText variant="muted">{t('add.store')}</ThemedText>
            <Chip
              icon="storefront-outline"
              label={store ?? t('add.chooseStore')}
              selected={store !== null}
              accessibilityLabel={`${t('add.storeTitle')} ${store ?? ''}`}
              onPress={() => setStoreOpen(true)}
            />
          </View>
          {badPrices.length > 0 && (
            <ThemedText style={[styles.hint, { color: c.dangerFg }]}>
              {t('add.badPrices')}
            </ThemedText>
          )}
          <Button
            label={tn('add.save', basket.length)}
            icon="checkmark"
            disabled={saving || badPrices.length > 0}
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
          <Button label={t('common.done')} onPress={() => setQuantityFor(null)} />
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
        visible={storeOpen}
        onClose={() => setStoreOpen(false)}
        title={t('add.storeTitle')}
        subtitle={t('add.storeHint')}>
        <ChipRow>
          {STORES.map((name) => (
            <Chip
              key={name}
              label={name}
              selected={store === name}
              onPress={() => {
                setStoreChoice(name);
                setStoreOpen(false);
              }}
            />
          ))}
          <Chip
            label={t('add.noStore')}
            selected={store === null}
            onPress={() => {
              setStoreChoice(null);
              setStoreOpen(false);
            }}
          />
        </ChipRow>
        <TextInput
          value={otherStore}
          onChangeText={setOtherStore}
          placeholder={t('add.otherStorePlaceholder')}
          placeholderTextColor={c.textMuted}
          accessibilityLabel={t('add.otherStore')}
          maxLength={40}
          style={[
            styles.input,
            { color: c.text, borderColor: c.border, backgroundColor: c.background },
          ]}
        />
        <Button
          label={t('add.otherStore')}
          variant="secondary"
          disabled={!otherStore.trim()}
          onPress={() => {
            setStoreChoice(otherStore.trim());
            setOtherStore('');
            setStoreOpen(false);
          }}
        />
      </Sheet>

      <Sheet
        visible={listOpen}
        onClose={() => setListOpen(false)}
        title={t('add.listTitle')}
        subtitle={t('add.listHint')}>
        <TextInput
          value={listText}
          onChangeText={setListText}
          placeholder={t('add.listPlaceholder')}
          placeholderTextColor={c.textMuted}
          accessibilityLabel={t('add.listTitle')}
          multiline
          autoFocus
          textAlignVertical="top"
          style={[
            styles.input,
            styles.listInput,
            { color: c.text, borderColor: c.border, backgroundColor: c.background },
          ]}
        />
        {listUnknown.length > 0 && (
          <ThemedText style={{ color: c.warnFg }}>
            {t('add.listUnknown', { list: joinList(listUnknown) })}
          </ThemedText>
        )}
        <Button label={t('add.listAdd')} icon="add" disabled={!listText.trim()} onPress={addList} />
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
  basketEntry: { paddingVertical: spacing.xs, gap: spacing.xs },
  basketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH - 8,
  },
  basketChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginLeft: 36 },
  priceInput: {
    minHeight: MIN_TOUCH - 4,
    width: 110,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  basketName: { fontSize: 16, fontWeight: '600' },
  remove: { minWidth: MIN_TOUCH - 8, alignItems: 'center' },
  purchasedRow: { gap: spacing.xs },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  listInput: { minHeight: 110, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  input: {
    minHeight: MIN_TOUCH + 4,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 17,
  },
});
