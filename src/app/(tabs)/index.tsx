import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { archiveUnanswered, type InventoryItem } from '@/db/inventory-repo';
import { useDb } from '@/db/provider';
import { LOCATIONS, type Location } from '@/features/catalog/catalog';
import { isHighRisk, type Urgency } from '@/features/expiry/expiry';
import { ItemActionSheet, LOCATION_ICON } from '@/features/inventory/components/action-sheet';
import { URGENCY_ICON, urgencyColors } from '@/features/inventory/components/expiry-pill';
import { CookTodayCard, ExpiredPrompt } from '@/features/inventory/components/home-cards';
import { ItemRow } from '@/features/inventory/components/item-row';
import { buildHome, type Row } from '@/features/inventory/grouping';
import {
  notifyInventoryChanged,
  useActiveItems,
  useProductLookup,
  useToday,
} from '@/features/inventory/store';
import { useItemActions } from '@/features/inventory/use-item-actions';
import { NotificationPrompt } from '@/features/notifications/notification-prompt';
import { t, tn } from '@/i18n';
import { addDays } from '@/lib/dates';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

// Lo vencido sin respuesta se archiva como "sin información" después de estos días.
const ARCHIVE_AFTER_DAYS = 3;
const MAX_PROMPTS = 3;

export default function HomeScreen() {
  const c = useThemeColors();
  const db = useDb();
  const router = useRouter();
  const today = useToday();
  const { data: items, error, reload } = useActiveItems();
  const lookup = useProductLookup();
  const { run, runMany } = useItemActions();

  const [location, setLocation] = useState<Location | 'all'>('all');
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState<{ item: InventoryItem; view: 'main' | 'discard' } | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    archiveUnanswered(db, addDays(today, -ARCHIVE_AFTER_DAYS))
      .then((count) => count > 0 && notifyInventoryChanged())
      .catch(() => {});
  }, [db, today]);

  const home = useMemo(
    () => buildHome(items ?? [], today, { location, query }),
    [items, today, location, query],
  );

  const emojiFor = useCallback(
    (item: InventoryItem) => lookup(item.productId)?.emoji ?? '🛒',
    [lookup],
  );

  const onPress = useCallback(
    (item: InventoryItem) => {
      if (selecting) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(item.id)) {
            next.delete(item.id);
          } else {
            next.add(item.id);
          }
          return next;
        });
      } else {
        router.push({ pathname: '/item/[id]', params: { id: item.id } });
      }
    },
    [router, selecting],
  );
  const onAte = useCallback((item: InventoryItem) => run(item, { type: 'consume' }), [run]);
  const onDiscard = useCallback((item: InventoryItem) => setMenu({ item, view: 'discard' }), []);
  const onLongPress = useCallback((item: InventoryItem) => setMenu({ item, view: 'main' }), []);

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };
  const selectedItems = (items ?? []).filter((i) => selected.has(i.id));

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ThemedText>{t('common.loadError')}</ThemedText>
        <Button label={t('common.retry')} onPress={reload} />
      </View>
    );
  }

  if (items && items.length === 0) {
    return (
      <View style={[styles.flex, { backgroundColor: c.background }]}>
        <EmptyState icon="basket-outline" title={t('home.emptyTitle')} body={t('home.emptyBody')} />
        <View style={styles.emptyAction}>
          <Button icon="add" label={t('home.emptyAction')} onPress={() => router.push('/add')} />
        </View>
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      {home.expired.slice(0, MAX_PROMPTS).map((item) => (
        <ExpiredPrompt
          key={item.id}
          item={item}
          highRisk={(() => {
            const p = lookup(item.productId);
            return p ? isHighRisk(p) : true;
          })()}
          onAte={() => run(item, { type: 'consume' })}
          onFroze={() => run(item, { type: 'freeze' })}
          onDiscarded={() => setMenu({ item, view: 'discard' })}
        />
      ))}
      <CookTodayCard items={home.cookToday} today={today} emojiFor={emojiFor} />
      <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Ionicons name="search" size={18} color={c.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('home.searchPlaceholder')}
          placeholderTextColor={c.textMuted}
          accessibilityLabel={t('home.searchPlaceholder')}
          returnKeyType="search"
          style={[styles.searchInput, { color: c.text }]}
        />
      </View>
      <View style={styles.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          style={styles.flex}>
          <Chip
            label={t('home.filterAll')}
            selected={location === 'all'}
            onPress={() => setLocation('all')}
          />
          {LOCATIONS.map((l) => (
            <Chip
              key={l}
              icon={LOCATION_ICON[l]}
              label={t(`locations.${l}`)}
              selected={location === l}
              onPress={() => setLocation(l)}
            />
          ))}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          onPress={() => (selecting ? stopSelecting() : setSelecting(true))}
          style={styles.selectToggle}>
          <ThemedText style={{ color: c.primary, fontWeight: '600' }}>
            {selecting ? t('common.cancel') : t('home.select')}
          </ThemedText>
        </Pressable>
      </View>
      {home.sections.length === 0 && items && (
        <ThemedText variant="muted" style={styles.noResults}>
          {t('home.noResults')}
        </ThemedText>
      )}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <SectionList<Row, { urgency: Urgency; key: string; data: Row[] }>
        sections={home.sections.map((s) => ({ ...s, key: s.urgency }))}
        keyExtractor={(row) => row.item.id}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => {
          const { fg } = urgencyColors(section.urgency, c);
          return (
            <View style={[styles.sectionHeader, { backgroundColor: c.background }]}>
              <Ionicons name={URGENCY_ICON[section.urgency]} size={16} color={fg} />
              <ThemedText
                style={[styles.sectionTitle, { color: c.text }]}
                accessibilityRole="header">
                {t(`urgency.${section.urgency}`)}
              </ThemedText>
              <ThemedText variant="muted" style={styles.sectionCount}>
                {section.data.length}
              </ThemedText>
            </View>
          );
        }}
        renderItem={({ item: row }) => (
          <ItemRow
            row={row}
            emoji={emojiFor(row.item)}
            today={today}
            selecting={selecting}
            selected={selected.has(row.item.id)}
            onPress={onPress}
            onLongPress={onLongPress}
            onAte={onAte}
            onDiscard={onDiscard}
          />
        )}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: c.border }]} />
        )}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />

      {selecting ? (
        <View style={[styles.bulkBar, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ThemedText style={styles.bulkCount}>
            {tn('home.selectedCount', selected.size)}
          </ThemedText>
          <Button
            variant="secondary"
            icon="checkmark-circle"
            label={t('actions.ate')}
            disabled={selected.size === 0}
            onPress={async () => {
              await runMany(selectedItems, { type: 'consume' });
              stopSelecting();
            }}
          />
          <Button
            variant="danger"
            icon="trash"
            label={t('actions.discarded')}
            disabled={selected.size === 0}
            onPress={async () => {
              await runMany(selectedItems, { type: 'discard' });
              stopSelecting();
            }}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.addButton')}
          onPress={() => router.push('/add')}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 },
          ]}>
          <Ionicons name="add" size={32} color={c.onAccent} />
        </Pressable>
      )}

      <ItemActionSheet
        key={menu ? `${menu.item.id}-${menu.view}` : 'closed'}
        item={menu?.item ?? null}
        initialView={menu?.view}
        today={today}
        onClose={() => setMenu(null)}
        onAction={(item, action) => void run(item, action)}
      />
      <NotificationPrompt hasItems={(items?.length ?? 0) > 0} />
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
  emptyAction: { padding: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: spacing.md, padding: spacing.md, paddingBottom: spacing.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH,
  },
  searchInput: { flex: 1, fontSize: 16, minHeight: MIN_TOUCH },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filters: { gap: spacing.sm, paddingRight: spacing.sm },
  selectToggle: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingLeft: spacing.xs },
  noResults: { textAlign: 'center', paddingVertical: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount: { fontSize: 15 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 76 },
  listContent: { paddingBottom: 120 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  bulkBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  bulkCount: { flex: 1, fontWeight: '600' },
});
