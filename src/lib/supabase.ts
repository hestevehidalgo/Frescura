// Cliente de Supabase con sesión anónima: el usuario no se registra, pero tiene un id para las
// cuotas. La sesión se guarda en el celular (localStorage de expo-sqlite).
import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { BACKEND, isBackendConfigured } from '@/config/backend';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isBackendConfigured()) {
    return null;
  }
  if (!client) {
    client = createClient(BACKEND.url, BACKEND.publishableKey, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/** Devuelve un cliente con sesión (crea una anónima la primera vez). */
export async function getSignedInSupabase(): Promise<SupabaseClient | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      throw error;
    }
  }
  return supabase;
}
