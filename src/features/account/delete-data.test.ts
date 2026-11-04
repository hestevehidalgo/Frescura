import { FunctionsHttpError } from '@supabase/supabase-js';

import { listItems } from '@/db/inventory-repo';
import { createMigratedDb } from '@/db/test-db';
import { getCatalogProduct } from '@/features/catalog/catalog';
import { addToInventory } from '@/features/inventory/service';
import { getSupabase } from '@/lib/supabase';

import { deleteAllMyData } from './delete-data';

jest.mock('@/lib/supabase', () => ({ getSupabase: jest.fn() }));
const mockedGetSupabase = getSupabase as jest.Mock;

async function dbWithItem() {
  const db = await createMigratedDb();
  const palta = getCatalogProduct('palta');
  if (palta) {
    await addToInventory(db, { product: palta, quantity: 1 });
  }
  return db;
}

function fakeClient(session: unknown, invokeError: unknown) {
  return {
    auth: {
      getSession: jest.fn(async () => ({ data: { session } })),
      signOut: jest.fn(async () => ({ error: null })),
    },
    functions: { invoke: jest.fn(async () => ({ data: null, error: invokeError })) },
  };
}

it('sin servidor configurado, borra solo lo local', async () => {
  mockedGetSupabase.mockReturnValue(null);
  const db = await dbWithItem();
  expect(await deleteAllMyData(db)).toBe('ok');
  expect(await listItems(db)).toEqual([]);
});

it('sin sesión no llama al servidor', async () => {
  const client = fakeClient(null, null);
  mockedGetSupabase.mockReturnValue(client);
  const db = await dbWithItem();
  expect(await deleteAllMyData(db)).toBe('ok');
  expect(client.functions.invoke).not.toHaveBeenCalled();
});

it('con sesión borra la cuenta del servidor y cierra la sesión', async () => {
  const client = fakeClient({ access_token: 'x' }, null);
  mockedGetSupabase.mockReturnValue(client);
  const db = await dbWithItem();
  expect(await deleteAllMyData(db)).toBe('ok');
  expect(client.functions.invoke).toHaveBeenCalledWith('delete-account', { body: {} });
  expect(client.auth.signOut).toHaveBeenCalled();
  expect(await listItems(db)).toEqual([]);
});

it('sin internet no borra nada, para poder reintentar', async () => {
  mockedGetSupabase.mockReturnValue(fakeClient({ access_token: 'x' }, new Error('network')));
  const db = await dbWithItem();
  expect(await deleteAllMyData(db)).toBe('offline');
  expect(await listItems(db)).toHaveLength(1);
});

it('si el servidor falla, tampoco borra lo local', async () => {
  const error = new FunctionsHttpError(new Response('{}', { status: 500 }));
  mockedGetSupabase.mockReturnValue(fakeClient({ access_token: 'x' }, error));
  const db = await dbWithItem();
  expect(await deleteAllMyData(db)).toBe('server');
  expect(await listItems(db)).toHaveLength(1);
});
