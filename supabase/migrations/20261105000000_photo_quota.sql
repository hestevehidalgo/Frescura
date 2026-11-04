-- Madurez por foto: nueva cuota mensual ("photo"), separada de boletas y recetas.

alter table public.quotas add column if not exists photos_used integer not null default 0;

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
  elsif p_kind = 'photo' then
    update quotas set photos_used = photos_used + 1
      where user_id = p_user and month = p_month and photos_used < p_limit
      returning photos_used into used;
  else
    update quotas set recipes_used = recipes_used + 1
      where user_id = p_user and month = p_month and recipes_used < p_limit
      returning recipes_used into used;
  end if;
  return coalesce(used, -1);
end $$;

create or replace function public.release_quota(p_user uuid, p_month text, p_kind text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_kind = 'scan' then
    update quotas set scans_used = greatest(0, scans_used - 1)
      where user_id = p_user and month = p_month;
  elsif p_kind = 'photo' then
    update quotas set photos_used = greatest(0, photos_used - 1)
      where user_id = p_user and month = p_month;
  else
    update quotas set recipes_used = greatest(0, recipes_used - 1)
      where user_id = p_user and month = p_month;
  end if;
end $$;

revoke execute on function public.try_consume_quota(uuid, text, text, integer) from public, anon, authenticated;
revoke execute on function public.release_quota(uuid, text, text) from public, anon, authenticated;
