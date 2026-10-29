import { t } from '@/i18n';
import { daysBetween, formatShort, type IsoDate } from '@/lib/dates';

/** "Vence hoy", "Mañana", "En 3 días", "Venció ayer", "12 nov"… */
export function relativeExpiryLabel(expiresAt: IsoDate, today: IsoDate): string {
  const days = daysBetween(today, expiresAt);
  if (days < -1) {
    return t('expiry.expiredDays', { n: -days });
  }
  if (days === -1) {
    return t('expiry.expiredYesterday');
  }
  if (days === 0) {
    return t('expiry.today');
  }
  if (days === 1) {
    return t('expiry.tomorrow');
  }
  if (days < 7) {
    return t('expiry.inDays', { n: days });
  }
  return formatShort(expiresAt);
}
