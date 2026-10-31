import { FunctionsHttpError } from '@supabase/supabase-js';

import { getSignedInSupabase } from '@/lib/supabase';

import type { ParseReceiptResponse } from '../../../supabase/functions/parse-receipt/logic';

export type ScanResult = ParseReceiptResponse | { ok: false; error: 'offline' | 'not_configured' };

/** Manda la foto (base64) a la función parse-receipt. */
export async function requestReceiptParse(imageBase64: string): Promise<ScanResult> {
  let supabase;
  try {
    supabase = await getSignedInSupabase();
  } catch {
    return { ok: false, error: 'offline' };
  }
  if (!supabase) {
    return { ok: false, error: 'not_configured' };
  }
  const { data, error } = await supabase.functions.invoke<ParseReceiptResponse>('parse-receipt', {
    body: { image: imageBase64, mediaType: 'image/jpeg' },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      // El servidor respondió con un error conocido (cuota, límite, etc.).
      try {
        return (await (error.context as Response).json()) as ParseReceiptResponse;
      } catch {
        return { ok: false, error: 'server' };
      }
    }
    return { ok: false, error: 'offline' };
  }
  return data ?? { ok: false, error: 'server' };
}
