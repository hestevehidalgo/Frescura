-- Fase 2: cuotas por usuario y registro de costos de IA.
-- El backend NO guarda qué compró cada usuario: solo contadores y métricas de uso.

create table if not exists public.quotas (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  scans_used integer not null default 0,
  recipes_used integer not null default 0,
  primary key (user_id, month)
);

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  function text not null,
  model text not null,
  input_tokens integer not null,
  output_tokens integer not null,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  usd_estimated numeric(12, 6) not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_time on public.ai_usage (user_id, created_at);

-- Row Level Security sin políticas: nadie desde la app puede leer ni escribir estas tablas.
-- Solo la Edge Function (con la clave secreta) las usa.
alter table public.quotas enable row level security;
alter table public.ai_usage enable row level security;

-- Descuenta una unidad de la cuota si queda. Devuelve cuántas van usadas, o -1 si no queda.
create or replace function public.try_consume_quota(
  p_user uuid, p_month text, p_kind text, p_limit integer
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  used integer;
begin
  insert into quotas (user_id, month) values (p_user, p_month) on conflict do nothing;
  if p_kind = 'scan' then
    update quotas set scans_used = scans_used + 1
      where user_id = p_user and month = p_month and scans_used < p_limit
      returning scans_used into used;
  else
    update quotas set recipes_used = recipes_used + 1
      where user_id = p_user and month = p_month and recipes_used < p_limit
      returning recipes_used into used;
  end if;
  return coalesce(used, -1);
end $$;

-- Devuelve una unidad de cuota (cuando la IA falla, el usuario no pierde su escaneo).
create or replace function public.release_quota(p_user uuid, p_month text, p_kind text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_kind = 'scan' then
    update quotas set scans_used = greatest(0, scans_used - 1)
      where user_id = p_user and month = p_month;
  else
    update quotas set recipes_used = greatest(0, recipes_used - 1)
      where user_id = p_user and month = p_month;
  end if;
end $$;

revoke execute on function public.try_consume_quota(uuid, text, text, integer) from public, anon, authenticated;
revoke execute on function public.release_quota(uuid, text, text) from public, anon, authenticated;
