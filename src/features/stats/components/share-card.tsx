// Tarjeta para compartir el mes como imagen ("En noviembre salvé $5.480 en comida").
// No muestra compras ni precios: solo el resultado.

import * as Sharing from 'expo-sharing';
import { useRef, useState, type ComponentRef } from 'react';
import { Image, Platform, Share, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/undo-toast';
import { APP_CONFIG } from '@/config/app';
import { t } from '@/i18n';
import { useSingleFlight } from '@/lib/single-flight';
import { radius, spacing, useThemeColors } from '@/theme';

import type { ShareContent } from '../share';

const LOGO = require('../../../../assets/images/splash-icon.png') as number;

export function ShareMonthSheet({
  content,
  visible,
  onClose,
}: {
  content: ShareContent;
  visible: boolean;
  onClose: () => void;
}) {
  const c = useThemeColors();
  const toast = useToast();
  const once = useSingleFlight();
  const card = useRef<ComponentRef<typeof View>>(null);
  const [sharing, setSharing] = useState(false);

  const shareText = async () => {
    await Share.share({ message: content.message }).catch(() => undefined);
  };

  const share = async () => {
    setSharing(true);
    try {
      // En la web no hay archivos locales para compartir: se comparte el texto.
      if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
        await shareText();
        return;
      }
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('share.title') });
    } catch {
      toast(t('share.error'));
      await shareText();
    } finally {
      setSharing(false);
      onClose();
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('share.title')}
      subtitle={t('share.subtitle')}>
      <View ref={card} collapsable={false} style={[styles.card, { backgroundColor: c.primary }]}>
        <View style={styles.brand}>
          <View style={[styles.logoBadge, { backgroundColor: c.onPrimary }]}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </View>
          <ThemedText style={[styles.brandName, { color: c.onPrimary }]}>
            {APP_CONFIG.name}
          </ThemedText>
        </View>
        <ThemedText style={[styles.headline, { color: c.onPrimary }]}>
          {content.headline}
        </ThemedText>
        {content.lines.map((line) => (
          <ThemedText key={line} style={[styles.line, { color: c.onPrimary }]}>
            {line}
          </ThemedText>
        ))}
        <ThemedText style={[styles.footer, { color: c.onPrimary }]}>{t('share.footer')}</ThemedText>
      </View>
      <Button
        icon="share-social-outline"
        label={t('share.shareImage')}
        disabled={sharing}
        onPress={() => void once(share)}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 30, height: 30 },
  brandName: { fontSize: 20, fontWeight: '800' },
  headline: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  line: { fontSize: 16, lineHeight: 22 },
  footer: { fontSize: 14, lineHeight: 20, marginTop: spacing.sm, opacity: 0.9 },
});
