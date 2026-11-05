import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/undo-toast';
import { useDb } from '@/db/provider';
import { findReceipt } from '@/db/receipts-repo';
import { genericProduct, LOCATIONS } from '@/features/catalog/catalog';
import { estimateExpiry } from '@/features/expiry/expiry';
import { LOCATION_ICON } from '@/features/inventory/components/action-sheet';
import { notifyInventoryChanged } from '@/features/inventory/store';
import { getPendingReview, setPendingReview } from '@/features/receipts/pending';
import {
  reviewMismatch,
  saveReview,
  undoSavedReview,
  type ReviewRow,
} from '@/features/receipts/review';
import { t, tn } from '@/i18n';
import { formatDate, formatShort } from '@/lib/dates';
import { formatClp, parsePrice } from '@/lib/money';
import { formatDecimal, formatQuantity, parseDecimal } from '@/lib/quantity';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

export default function ReceiptReviewScreen() {
  const c = useThemeColors();
  const db = useDb();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [review] = useState(() => getPendingReview());
  const [rows, setRows] = useState<ReviewRow[]>(review?.rows ?? []);
  const [showExcluded, setShowExcluded] = useState(false);
  const [editing, setEditing] = useState<ReviewRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (review?.fingerprint) {
      findReceipt(db, { fingerprint: review.fingerprint })
        .then((found) => setDuplicate(found !== null))
        .catch(() => {});
    }
  }, [db, review]);

  const expiryLabel = useMemo(() => {
    const labels = new Map<string, string>();
    if (!review) {
      return labels;
    }
    for (const row of rows) {
      const product =
        row.catalogProduct ?? genericProduct('preview', row.name, row.categoryId, row.unit);
      const { expiresAt } = estimateExpiry({
        product,
        location: row.location,
        purchasedAt: review.purchasedAt,
      });
      labels.set(row.key, formatShort(expiresAt));
    }
    return labels;
  }, [review, rows]);

  if (!review) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ThemedText variant="muted">{t('review.nothing')}</ThemedText>
        <Button label={t('common.back')} onPress={() => router.back()} />
      </View>
    );
  }

  const update = (key: string, patch: Partial<ReviewRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Se recalcula si la persona corrige un precio.
  const mismatchClp = reviewMismatch(rows, review.totalClp, review.discountsClp);
  const parsedQuantity = parseDecimal(editQuantity);
  const parsedPrice = parsePrice(editPrice);
  const editValid =
    editName.trim().length > 0 &&
    parsedQuantity !== null &&
    parsedQuantity > 0 &&
    parsedPrice !== null;
  const food = rows.filter((r) => r.isFood);
  const excluded = rows.filter((r) => !r.isFood);
  const included = rows.filter((r) => r.include);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveReview(db, { ...review, rows });
      setPendingReview(null);
      notifyInventoryChanged();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(tn('review.saved', saved.itemIds.length), async () => {
        await undoSavedReview(db, saved);
        notifyInventoryChanged();
      });
      router.dismissTo('/');
    } catch {
      toast(t('toasts.error'));
      setSaving(false);
    }
  };

  const renderRow = (row: ReviewRow) => (
    <View
      key={row.key}
      style={[
        styles.row,
        {
          backgroundColor: row.lowConfidence && row.include ? c.warnBg : c.surface,
          opacity: row.include ? 1 : 0.6,
        },
      ]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: row.include }}
        accessibilityLabel={t('review.include', { name: row.name })}
        onPress={() => update(row.key, { include: !row.include })}
        style={styles.check}>
        <Ionicons
          name={row.include ? 'checkbox' : 'square-outline'}
          size={26}
          color={row.include ? c.primary : c.tabInactive}
        />
      </Pressable>
      <View style={styles.rowBody}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={t('review.editName')}
          onPress={() => {
            setEditName(row.name);
            setEditQuantity(formatDecimal(row.quantity, 3));
            setEditPrice(String(row.priceClp));
            setEditing(row);
          }}>
          <ThemedText style={styles.name}>{row.name}</ThemedText>
        </Pressable>
        <ThemedText variant="muted" style={styles.small} numberOfLines={1}>
          {t('review.printed', { text: row.printed })}
        </ThemedText>
        <ThemedText style={styles.small}>
          {formatQuantity(row.quantity, row.unit)} · {formatClp(row.priceClp)}
        </ThemedText>
        {row.include && (
          <View style={styles.chips}>
            <Chip
              icon={LOCATION_ICON[row.location]}
              label={t(`locations.${row.location}`)}
              accessibilityLabel={`${t('actions.changeLocation')}: ${t(`locations.${row.location}`)}`}
              onPress={() => {
                const next = LOCATIONS[(LOCATIONS.indexOf(row.location) + 1) % LOCATIONS.length];
                update(row.key, { location: next ?? row.location });
              }}
            />
            <ThemedText variant="muted" style={styles.small}>
              {t('review.expiresAround', { date: expiryLabel.get(row.key) ?? '' })}
            </ThemedText>
          </View>
        )}
        {row.lowConfidence && row.include && (
          <View style={styles.warnLine}>
            <Ionicons name="eye-outline" size={16} color={c.warnFg} />
            <ThemedText style={[styles.small, { color: c.warnFg, fontWeight: '600' }]}>
              {t('review.checkLine')}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}>
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <ThemedText variant="subtitle">{review.chain ?? t('review.unknownStore')}</ThemedText>
          <ThemedText>{t('review.date', { date: formatDate(review.purchasedAt) })}</ThemedText>
          {review.totalClp !== null && (
            <ThemedText>{t('review.total', { total: formatClp(review.totalClp) })}</ThemedText>
          )}
        </View>

        {mismatchClp !== null && (
          <View style={[styles.banner, { backgroundColor: c.warnBg }]}>
            <Ionicons name="warning" size={20} color={c.warnFg} />
            <ThemedText style={[styles.flex, { color: c.warnFg }]}>
              {t('review.mismatch', { diff: formatClp(Math.abs(mismatchClp)) })}
            </ThemedText>
          </View>
        )}
        {duplicate && (
          <View style={[styles.banner, { backgroundColor: c.dangerBg }]}>
            <Ionicons name="copy-outline" size={20} color={c.dangerFg} />
            <ThemedText style={[styles.flex, { color: c.dangerFg }]}>
              {t('review.duplicate')}
            </ThemedText>
          </View>
        )}

        <ThemedText variant="muted" style={styles.small}>
          {t('review.editHint')}
        </ThemedText>
        <View style={styles.list}>{food.map(renderRow)}</View>

        {excluded.length > 0 && (
          <View style={styles.list}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showExcluded }}
              onPress={() => setShowExcluded((v) => !v)}
              style={styles.excludedHeader}>
              <ThemedText variant="muted" style={styles.flex}>
                {tn('review.excludedTitle', excluded.length)}
              </ThemedText>
              <ThemedText style={{ color: c.primary, fontWeight: '600' }}>
                {showExcluded ? t('review.hide') : t('review.show')}
              </ThemedText>
            </Pressable>
            {showExcluded && excluded.map(renderRow)}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}>
        <Button
          icon="checkmark"
          label={tn('review.save', included.length)}
          disabled={saving || included.length === 0}
          onPress={() => void save()}
        />
      </View>

      <Sheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={t('review.editLine')}
        subtitle={editing ? t('review.printed', { text: editing.printed }) : undefined}>
        <ThemedText style={styles.fieldLabel}>{t('review.editName')}</ThemedText>
        <TextInput
          value={editName}
          onChangeText={setEditName}
          accessibilityLabel={t('review.editName')}
          style={[
            styles.input,
            { color: c.text, borderColor: c.border, backgroundColor: c.background },
          ]}
        />
        <View style={styles.editRow}>
          <View style={styles.flex}>
            <ThemedText style={styles.fieldLabel}>
              {t('review.editQuantity', { unit: editing ? t(`units.${editing.unit}`) : '' })}
            </ThemedText>
            <TextInput
              value={editQuantity}
              onChangeText={setEditQuantity}
              keyboardType="decimal-pad"
              accessibilityLabel={t('review.editQuantityLabel')}
              style={[
                styles.input,
                {
                  color: c.text,
                  backgroundColor: c.background,
                  borderColor:
                    parsedQuantity === null || parsedQuantity <= 0 ? c.dangerFg : c.border,
                },
              ]}
            />
          </View>
          <View style={styles.flex}>
            <ThemedText style={styles.fieldLabel}>{t('review.editPrice')}</ThemedText>
            <TextInput
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="number-pad"
              accessibilityLabel={t('review.editPrice')}
              style={[
                styles.input,
                {
                  color: c.text,
                  backgroundColor: c.background,
                  borderColor: parsedPrice === null ? c.dangerFg : c.border,
                },
              ]}
            />
          </View>
        </View>
        <Button
          label={t('common.save')}
          disabled={!editValid}
          onPress={() => {
            if (editing && parsedQuantity !== null && parsedPrice !== null) {
              update(editing.key, {
                name: editName.trim(),
                quantity: parsedQuantity,
                priceClp: parsedPrice,
              });
            }
            setEditing(null);
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  content: { padding: spacing.md, gap: spacing.md },
  card: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md },
  check: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  warnLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  excludedHeader: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    padding: spacing.md,
  },
  fieldLabel: { fontWeight: '600' },
  editRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    minHeight: MIN_TOUCH + 4,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 17,
  },
});
