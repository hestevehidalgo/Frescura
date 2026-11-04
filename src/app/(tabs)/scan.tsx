import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { isBackendConfigured } from '@/config/backend';
import { useDb } from '@/db/provider';
import { findReceipt } from '@/db/receipts-repo';
import { rememberAiQuota, saveSettings } from '@/db/settings-repo';
import { notifySettingsChanged, useSettings, useToday } from '@/features/inventory/store';
import { requestReceiptParse } from '@/features/receipts/api';
import { captureReceipt } from '@/features/receipts/capture';
import { setPendingReview } from '@/features/receipts/pending';
import { buildReview } from '@/features/receipts/review';
import { t, tn, type MessageKey } from '@/i18n';
import { fingerprint } from '@/lib/hash';
import { useSingleFlight } from '@/lib/single-flight';
import { radius, spacing, useThemeColors } from '@/theme';

type ErrorKey =
  | 'quota'
  | 'rate_limited'
  | 'offline'
  | 'busy'
  | 'not_configured'
  | 'ai_failed'
  | 'invalid'
  | 'unauthorized'
  | 'server'
  | 'denied'
  | 'duplicate'
  | 'empty';

type State =
  { step: 'idle' } | { step: 'working'; message: MessageKey } | { step: 'error'; error: ErrorKey };

export default function ScanScreen() {
  const c = useThemeColors();
  const db = useDb();
  const router = useRouter();
  const once = useSingleFlight();
  const today = useToday();
  const { data: settings } = useSettings();
  const [state, setState] = useState<State>({ step: 'idle' });
  const [consentFor, setConsentFor] = useState<'camera' | 'library' | null>(null);
  const [scansLeft, setScansLeft] = useState<number | null>(null);

  const scan = async (source: 'camera' | 'library', consented = false) => {
    if (!isBackendConfigured()) {
      setState({ step: 'error', error: 'not_configured' });
      return;
    }
    if (!consented && !settings?.receiptPhotoConsent) {
      setConsentFor(source);
      return;
    }
    const image = await captureReceipt(source).catch(() => 'cancelled' as const);
    if (image === 'cancelled') {
      return;
    }
    if (image === 'denied') {
      setState({ step: 'error', error: 'denied' });
      return;
    }
    setState({ step: 'working', message: 'scan.steps.preparing' });
    // La misma foto no se paga dos veces.
    const imageHash = fingerprint(image.base64);
    if (await findReceipt(db, { imageHash })) {
      setState({ step: 'error', error: 'duplicate' });
      return;
    }
    setState({ step: 'working', message: 'scan.steps.reading' });
    const result = await requestReceiptParse(image.base64);
    if (!result.ok) {
      setState({ step: 'error', error: result.error });
      return;
    }
    setState({ step: 'working', message: 'scan.steps.recognizing' });
    setScansLeft(result.scansLeft);
    void rememberAiQuota(db, today.slice(0, 7), { scansLeft: result.scansLeft })
      .then(notifySettingsChanged)
      .catch(() => {});
    const review = buildReview(result.receipt, today, imageHash);
    if (review.rows.length === 0) {
      setState({ step: 'error', error: 'empty' });
      return;
    }
    setPendingReview(review);
    setState({ step: 'idle' });
    router.push('/receipt-review');
  };

  const acceptConsent = async () => {
    const source = consentFor;
    await saveSettings(db, { receiptPhotoConsent: true });
    notifySettingsChanged();
    setConsentFor(null);
    if (source) {
      await scan(source, true);
    }
  };

  const working = state.step === 'working';

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <View style={[styles.badge, { backgroundColor: c.surfaceAlt }]}>
        <Ionicons name="receipt-outline" size={40} color={c.primary} />
      </View>
      <ThemedText variant="title" style={styles.center} accessibilityRole="header">
        {t('scan.title')}
      </ThemedText>
      <ThemedText variant="muted" style={styles.center}>
        {t('scan.body')}
      </ThemedText>

      {working ? (
        <View style={styles.working} accessibilityLiveRegion="polite">
          <ActivityIndicator color={c.primary} size="large" />
          <ThemedText>{t(state.message)}</ThemedText>
        </View>
      ) : (
        <View style={styles.buttons}>
          <Button
            icon="camera"
            label={t('scan.takePhoto')}
            onPress={() => void once(() => scan('camera'))}
          />
          <Button
            variant="secondary"
            icon="images-outline"
            label={t('scan.fromLibrary')}
            onPress={() => void once(() => scan('library'))}
          />
          <Button
            variant="ghost"
            icon="add"
            label={t('scan.addInstead')}
            onPress={() => router.push('/add')}
          />
        </View>
      )}

      {state.step === 'error' && (
        <View
          style={[styles.card, { backgroundColor: c.dangerBg }]}
          accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={22} color={c.dangerFg} />
          <ThemedText style={[styles.flex, { color: c.dangerFg }]}>
            {t(`scan.errors.${state.error}`)}
          </ThemedText>
        </View>
      )}

      {scansLeft !== null && (
        <ThemedText variant="muted" style={styles.center}>
          {tn('scan.scansLeft', scansLeft)}
        </ThemedText>
      )}

      <View style={[styles.tips, { backgroundColor: c.surface }]}>
        <ThemedText style={styles.tipsTitle}>{t('scan.tipsTitle')}</ThemedText>
        {(['light', 'flat', 'thermal'] as const).map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <Ionicons name="checkmark" size={18} color={c.primary} />
            <ThemedText style={styles.flex}>{t(`scan.tips.${tip}`)}</ThemedText>
          </View>
        ))}
        <ThemedText variant="muted" style={styles.small}>
          {t('scan.privacy')}
        </ThemedText>
      </View>

      <Sheet
        visible={consentFor !== null}
        onClose={() => setConsentFor(null)}
        title={t('scan.consentTitle')}>
        <ThemedText variant="muted">{t('scan.consentBody')}</ThemedText>
        <Button label={t('scan.consentAccept')} onPress={() => void once(acceptConsent)} />
        <Button variant="ghost" label={t('common.cancel')} onPress={() => setConsentFor(null)} />
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'stretch',
    paddingBottom: spacing.xl * 2,
  },
  badge: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  center: { textAlign: 'center' },
  buttons: { gap: spacing.sm, marginTop: spacing.sm },
  working: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  tips: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, marginTop: spacing.sm },
  tipsTitle: { fontWeight: '700' },
  tipRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  small: { fontSize: 14, lineHeight: 20 },
});
