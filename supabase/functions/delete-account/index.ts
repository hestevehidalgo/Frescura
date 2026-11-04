// Edge Function delete-account (Supabase, Deno).
// "Borrar todos mis datos": elimina la cuenta anónima. Con ella se borran sus cuotas (cascade).
// En ai_usage las filas quedan sin usuario (solo tokens y costo, para las cuentas del proyecto).

import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

function secretKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    const parsed = JSON.parse(keys) as Record<string, string>;
    const key = parsed.default ?? Object.values(parsed)[0];
    if (key) {
      return key;
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', secretKey(), {
  auth: { persistSession: false },
});

function reply(status: number, body: { ok: boolean; error?: string }): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return reply(405, { ok: false, error: 'invalid' });
  }
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data: auth } = await admin.auth.getUser(token);
  const userId = auth.user?.id;
  if (!userId) {
    return reply(401, { ok: false, error: 'unauthorized' });
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('delete-account: no se pudo borrar', error.name);
    return reply(500, { ok: false, error: 'server' });
  }
  return reply(200, { ok: true });
});
