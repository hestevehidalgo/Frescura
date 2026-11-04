// "Borrar todos mis datos": primero la cuenta anónima del servidor (si existe), después todo lo
// del celular. Si no hay internet, no se borra nada para que la persona pueda reintentar.

import { FunctionsHttpError } from '@supabase/supabase-js';

import { wipeAllData } from '@/db/backup';
import type { Db } from '@/db/db';
import { getSupabase } from '@/lib/supabase';

export type DeleteResult = 'ok' | 'offline' | 'server';

async function deleteServerAccount(): Promise<DeleteResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return 'ok';
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    // Nunca usó el escaneo ni las recetas con IA: no hay nada en el servidor.
    return 'ok';
  }
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) {
    // 401: la cuenta ya no existe en el servidor. Se sigue con el borrado local.
    if (error instanceof FunctionsHttpError && (error.context as Response).status === 401) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      return 'ok';
    }
    return error instanceof FunctionsHttpError ? 'server' : 'offline';
  }
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  return 'ok';
}

export async function deleteAllMyData(db: Db): Promise<DeleteResult> {
  let server: DeleteResult;
  try {
    server = await deleteServerAccount();
  } catch {
    server = 'offline';
  }
  if (server !== 'ok') {
    return server;
  }
  await wipeAllData(db);
  return 'ok';
}
