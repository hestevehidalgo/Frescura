-- Fase 5: freno de gasto diario. Las Edge Functions consultan cuánto se gastó hoy (todas las
-- personas juntas) antes de llamar a la IA. Si pasa el tope (DAILY_LIMIT_USD), no se llama.

create or replace function public.ai_spend_since(p_since timestamptz)
returns numeric
language sql security definer set search_path = public stable as $$
  select coalesce(sum(usd_estimated), 0) from ai_usage where created_at >= p_since;
$$;

revoke execute on function public.ai_spend_since(timestamptz) from public, anon, authenticated;
