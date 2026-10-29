import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, ChipRow } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/undo-toast';
import { removeItems } from '@/db/inventory-repo';
import { createCustomProduct, findBarcode, findProduct, saveBarcode } from '@/db/products-repo';
import { useDb } from '@/db/provider';
import { allCategories, type Product } from '@/features/catalog/catalog';
import { lookupBarcode, matchCatalog } from '@/features/barcode/openfoodfacts';
import { addToInventory } from '@/features/inventory/service';
import { notifyInventoryChanged } from '@/features/inventory/store';
import { t, tn } from '@/i18n';
import { capitalize } from '@/lib/text';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

type State =
  | { step: 'scanning' }
  | { step: 'looking'; ean: string }
  | { step: 'found'; ean: string; product: Product; label: string; fromOff: boolean }
  | { step: 'unknown'; ean: string; offline: boolean };

export default function BarcodeScreen() {
  const c = useThemeColors();
  const db = useDb();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<State>({ step: 'scanning' });
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const resolve = async (ean: string) => {
    setState({ step: 'looking', ean });
    void Haptics.selectionAsync();
    // 1. Ya lo conocemos en este celular: sin internet ni consultas.
    const known = await findBarcode(db, ean);
    const knownProduct = known ? await findProduct(db, known.productId) : null;
    if (known && knownProduct) {
      setState({ step: 'found', ean, product: knownProduct, label: known.name, fromOff: false });
      return;
    }
    // 2. Open Food Facts, gratis.
    const result = await lookupBarcode(ean);
    if (result.status === 'found') {
      const { name: offName, brand, categoryId } = result.product;
      const label = brand ? `${offName} (${brand})` : offName;
      const fromCatalog = matchCatalog(offName);
      if (fromCatalog || categoryId) {
        const product =
          fromCatalog ??
          (await createCustomProduct(db, {
            name: capitalize(offName),
            categoryId: categoryId ?? 'otros',
            unit: 'un',
          }));
        await saveBarcode(db, {
          ean,
          productId: product.id,
          name: label,
          brand,
          source: 'openfoodfacts',
        });
        setState({ step: 'found', ean, product, label, fromOff: true });
        return;
      }
      setName(capitalize(offName));
      setCategory(null);
      setState({ step: 'unknown', ean, offline: false });
      return;
    }
    // 3. No lo conocemos: el usuario lo nombra una vez y queda guardado.
    setName('');
    setCategory(null);
    setState({
      step: 'unknown',
      ean,
      offline: result.status === 'offline' || result.status === 'rate_limited',
    });
  };

  const add = async (product: Product, displayName: string) => {
    const item = await addToInventory(db, { product, quantity: 1, displayName });
    notifyInventoryChanged();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast(tn('toasts.added', 1), async () => {
      await removeItems(db, [item.id]);
      notifyInventoryChanged();
    });
    setState({ step: 'scanning' });
  };

  if (!permission) {
    return <View style={[styles.flex, { backgroundColor: c.background }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ThemedText variant="subtitle" style={styles.centerText}>
          {t('barcode.permissionTitle')}
        </ThemedText>
        <ThemedText variant="muted" style={styles.centerText}>
          {t('barcode.permissionBody')}
        </ThemedText>
        <Button icon="camera" label={t('barcode.permissionButton')} onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: '#000' }]}>
      <CameraView
        style={styles.flex}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={state.step === 'scanning' ? ({ data }) => void resolve(data) : undefined}
      />
      <ScrollView
        style={[styles.panel, { backgroundColor: c.surface }]}
        contentContainerStyle={[styles.panelContent, { paddingBottom: insets.bottom + spacing.md }]}
        keyboardShouldPersistTaps="handled">
        {state.step === 'scanning' && (
          <ThemedText style={styles.centerText}>{t('barcode.hint')}</ThemedText>
        )}
        {state.step === 'looking' && (
          <ThemedText style={styles.centerText}>{t('barcode.looking')}</ThemedText>
        )}
        {state.step === 'found' && (
          <>
            <ThemedText variant="subtitle">
              {state.product.emoji} {t('barcode.found', { name: state.label })}
            </ThemedText>
            {state.fromOff && (
              <ThemedText variant="muted" style={styles.small}>
                {t('barcode.source')}
              </ThemedText>
            )}
            <Button
              icon="add"
              label={t('barcode.addIt')}
              onPress={() => void add(state.product, state.product.name)}
            />
            <Button
              variant="ghost"
              label={t('barcode.scanAgain')}
              onPress={() => setState({ step: 'scanning' })}
            />
          </>
        )}
        {state.step === 'unknown' && (
          <>
            <ThemedText variant="subtitle">
              {state.offline ? t('barcode.offline') : t('barcode.notFound')}
            </ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('barcode.namePlaceholder')}
              placeholderTextColor={c.textMuted}
              accessibilityLabel={t('barcode.namePlaceholder')}
              style={[
                styles.input,
                { color: c.text, borderColor: c.border, backgroundColor: c.background },
              ]}
            />
            <ThemedText variant="muted">{t('add.chooseCategory')}</ThemedText>
            <ChipRow>
              {allCategories().map((cat) => (
                <Chip
                  key={cat.id}
                  label={`${cat.emoji} ${cat.name}`}
                  selected={category === cat.id}
                  onPress={() => setCategory(cat.id)}
                />
              ))}
            </ChipRow>
            <Button
              icon="add"
              label={t('barcode.addIt')}
              disabled={!name.trim() || !category}
              onPress={async () => {
                if (!category) {
                  return;
                }
                const productName = capitalize(name.trim());
                const product =
                  matchCatalog(productName) ??
                  (await createCustomProduct(db, {
                    name: productName,
                    categoryId: category,
                    unit: 'un',
                  }));
                await saveBarcode(db, {
                  ean: state.ean,
                  productId: product.id,
                  name: productName,
                  brand: null,
                  source: 'user',
                });
                await add(product, productName);
              }}
            />
            <Button
              variant="ghost"
              label={t('barcode.scanAgain')}
              onPress={() => setState({ step: 'scanning' })}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  centerText: { textAlign: 'center' },
  panel: {
    flexGrow: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '60%',
  },
  panelContent: { padding: spacing.md, gap: spacing.sm },
  small: { fontSize: 14 },
  input: {
    minHeight: MIN_TOUCH + 4,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 17,
  },
});
