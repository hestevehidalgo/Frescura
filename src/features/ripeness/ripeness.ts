// Madurez por foto: la IA dice la etapa y la app decide qué hacer con ella.
// Solo cambia la respuesta a "¿Madura?"; las fechas siguen saliendo de la tabla de vida útil.

import { FunctionsHttpError } from '@supabase/supabase-js';

import { t, tn } from '@/i18n';
import { getSignedInSupabase } from '@/lib/supabase';

import {
  RIPENESS_PRODUCTS,
  type EstimateRipenessResponse,
  type RipenessProductId,
  type RipenessResult,
} from '../../../supabase/functions/estimate-ripeness/logic';

export type RipenessApiResult =
  EstimateRipenessResponse | { ok: false; error: 'offline' | 'not_configured' | 'server' };

/** Bajo esta confianza se avisa que la estimación no es segura. */
export const LOW_CONFIDENCE = 0.5;

export function supportsRipenessPhoto(productId: string): productId is RipenessProductId {
  return productId in RIPENESS_PRODUCTS;
}

/** Madura o no según la etapa. null = no se pudo reconocer: se deja como estaba. */
export function ripeFromStage(result: RipenessResult): boolean | null {
  switch (result.s) {
    case 'maduro':
    case 'muy_maduro':
      return true;
    case 'verde':
    case 'pinton':
      return false;
    case 'no_reconocido':
      return null;
  }
}

/** Texto corto para mostrar: "Pintón: lista en 2 días aprox." */
export function ripenessNote(result: RipenessResult): string {
  const base =
    result.s === 'verde' || result.s === 'pinton'
      ? tn(`ripeness.stageDays.${result.s}`, Math.max(1, result.d))
      : t(`ripeness.stage.${result.s}`);
  return result.k < LOW_CONFIDENCE && result.s !== 'no_reconocido'
    ? `${base} ${t('ripeness.unsure')}`
    : base;
}

export async function requestRipeness(
  imageBase64: string,
  product: RipenessProductId,
): Promise<RipenessApiResult> {
  let supabase;
  try {
    supabase = await getSignedInSupabase();
  } catch {
    return { ok: false, error: 'offline' };
  }
  if (!supabase) {
    return { ok: false, error: 'not_configured' };
  }
  const { data, error } = await supabase.functions.invoke<EstimateRipenessResponse>(
    'estimate-ripeness',
    { body: { image: imageBase64, product } },
  );
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        return (await (error.context as Response).json()) as EstimateRipenessResponse;
      } catch {
        return { ok: false, error: 'server' };
      }
    }
    return { ok: false, error: 'offline' };
  }
  return data ?? { ok: false, error: 'server' };
}

/** Mensaje de error para mostrar. */
export function ripenessErrorKey(
  error: Extract<RipenessApiResult, { ok: false }>['error'] | 'denied',
):
  | 'ripeness.errors.quota'
  | 'ripeness.errors.offline'
  | 'ripeness.errors.not_configured'
  | 'ripeness.errors.rate_limited'
  | 'ripeness.errors.busy'
  | 'ripeness.errors.denied'
  | 'ripeness.errors.failed' {
  switch (error) {
    case 'quota':
    case 'offline':
    case 'not_configured':
    case 'rate_limited':
    case 'busy':
    case 'denied':
      return `ripeness.errors.${error}`;
    default:
      return 'ripeness.errors.failed';
  }
}
