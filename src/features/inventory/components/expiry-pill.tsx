import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import type { IconName } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import type { Urgency } from '@/features/expiry/expiry';
import { relativeExpiryLabel } from '@/features/expiry/labels';
import type { IsoDate } from '@/lib/dates';
import { radius, spacing, useThemeColors, type ThemeColors } from '@/theme';

export const URGENCY_ICON: Record<Urgency, IconName> = {
  expired: 'alert-circle',
  today: 'alarm',
  soon: 'time',
  week: 'calendar',
  later: 'checkmark-circle-outline',
};

export function urgencyColors(urgency: Urgency, c: ThemeColors): { bg: string; fg: string } {
  switch (urgency) {
    case 'expired':
    case 'today':
      return { bg: c.dangerBg, fg: c.dangerFg };
    case 'soon':
      return { bg: c.warnBg, fg: c.warnFg };
    case 'week':
      return { bg: c.okBg, fg: c.okFg };
    case 'later':
      return { bg: c.neutralBg, fg: c.neutralFg };
  }
}

type Props = { expiresAt: IsoDate; urgency: Urgency; today: IsoDate };

/** Fecha con color, ícono y texto: nunca solo color. */
export function ExpiryPill({ expiresAt, urgency, today }: Props) {
  const c = useThemeColors();
  const { bg, fg } = urgencyColors(urgency, c);
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Ionicons name={URGENCY_ICON[urgency]} size={14} color={fg} accessible={false} />
      <ThemedText style={[styles.text, { color: fg }]} numberOfLines={1}>
        {relativeExpiryLabel(expiresAt, today)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  text: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
});
