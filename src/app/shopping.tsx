import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/undo-toast';
import { useDb } from '@/db/provider';
import {
  addShopping,
  clearCheckedShopping,
  removeShopping,
  setShoppingChecked,
  type ShoppingItem,
} from '@/db/shopping-repo';
import { relativeExpiryLabel } from '@/features/expiry/labels';
import {
  notifyShoppingChanged,
  useActiveItems,
  useShoppingList,
  useToday,
} from '@/features/inventory/store';
import { alreadyHave, shoppingFromText } from '@/features/shopping/shopping';
import { t, tn } from '@/i18n';
import { formatDecimal, isUnit } from '@/lib/quantity';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

/** Lista de compras: lo que falta comprar, con aviso si ya lo tienes en casa. */
export default function ShoppingScreen() {
  const c = useThemeColors();
  const db = useDb();
  const toast = useToast();
  const today = useToday();
  const { data: list } = useShoppingList();
  const { data: items } = useActiveItems();
  const [text, setText] = useState('');

  const add = async () => {
    const entry = shoppingFromText(text);
    if (!entry) {
      return;
    }
    const added = await addShopping(db, entry);
    setText('');
    notifyShoppingChanged();
    if (!added) {
      toast(t('shopping.alreadyInList', { name: entry.name }));
    }
  };

  const toggle = async (item: ShoppingItem) => {
    await setShoppingChecked(db, item.id, !item.checked);
    notifyShoppingChanged();
  };

  const remove = async (item: ShoppingItem) => {
    await removeShopping(db, item.id);
    notifyShoppingChanged();
    toast(t('shopping.removed', { name: item.name }), async () => {
      await addShopping(db, item);
      notifyShoppingChanged();
    });
  };

  const clearChecked = async () => {
    const count = await clearCheckedShopping(db);
    notifyShoppingChanged();
    toast(tn('shopping.cleared', count));
  };

  const pending = (list ?? []).filter((i) => !i.checked);
  const checked = (list ?? []).filter((i) => i.checked);

  const renderItem = ({ item }: { item: ShoppingItem }) => {
    const have = item.checked ? null : alreadyHave(item, items ?? []);
    const amount =
      item.quantity !== null && item.unit
        ? `${formatDecimal(item.quantity)} ${isUnit(item.unit) ? t(`units.${item.unit}`) : item.unit}`
        : null;
    return (
      <View style={[styles.row, { backgroundColor: c.surface }]}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.checked }}
          accessibilityLabel={item.name}
          onPress={() => void toggle(item)}
          style={styles.check}>
          <Ionicons
            name={item.checked ? 'checkbox' : 'square-outline'}
            size={26}
            color={item.checked ? c.primary : c.tabInactive}
          />
        </Pressable>
        <View style={styles.flex}>
          <ThemedText
            style={[
              styles.name,
              item.checked && { textDecorationLine: 'line-through', color: c.textMuted },
            ]}>
            {item.name}
            {amount && <ThemedText variant="muted">{`  ${amount}`}</ThemedText>}
          </ThemedText>
          {item.source === 'recipe' && !item.checked && (
            <ThemedText variant="muted" style={styles.small}>
              {t('shopping.fromRecipe')}
            </ThemedText>
          )}
          {have && (
            <View style={styles.haveRow}>
              <Ionicons name="home-outline" size={14} color={c.warnFg} />
              <ThemedText style={[styles.small, styles.flex, { color: c.warnFg }]}>
                {t('shopping.alreadyHave', {
                  amount: `${formatDecimal(have.quantity)} ${have.unit}`,
                  when: relativeExpiryLabel(have.expiresAt, today).toLowerCase(),
                })}
              </ThemedText>
            </View>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('shopping.remove', { name: item.name })}
          onPress={() => void remove(item)}
          hitSlop={8}
          style={styles.check}>
          <Ionicons name="close-circle-outline" size={22} color={c.textMuted} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <View style={styles.addRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => void add()}
          placeholder={t('shopping.placeholder')}
          placeholderTextColor={c.textMuted}
          accessibilityLabel={t('shopping.placeholder')}
          returnKeyType="done"
          style={[
            styles.input,
            styles.flex,
            { color: c.text, borderColor: c.border, backgroundColor: c.surface },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('shopping.add')}
          disabled={!text.trim()}
          onPress={() => void add()}
          style={[
            styles.addButton,
            { backgroundColor: c.primary, opacity: text.trim() ? 1 : 0.5 },
          ]}>
          <Ionicons name="add" size={26} color={c.onPrimary} />
        </Pressable>
      </View>
      {list && list.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title={t('shopping.emptyTitle')}
          body={t('shopping.emptyBody')}
        />
      ) : (
        <FlatList
          data={[...pending, ...checked]}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            checked.length > 0 ? (
              <Button
                variant="ghost"
                icon="trash-outline"
                label={tn('shopping.clearChecked', checked.length)}
                onPress={() => void clearChecked()}
                style={styles.footer}
              />
            ) : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  addRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  input: {
    minHeight: MIN_TOUCH + 4,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 17,
  },
  addButton: {
    width: MIN_TOUCH + 4,
    height: MIN_TOUCH + 4,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  separator: { height: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  check: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 17, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20 },
  haveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footer: { marginTop: spacing.md },
});
