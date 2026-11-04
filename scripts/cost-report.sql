-- Reporte de costos de IA. Pégalo en Supabase → SQL Editor y presiona Run.

-- Costo promedio por boleta, total del mes y cantidad de llamadas.
select
  to_char(created_at at time zone 'America/Santiago', 'YYYY-MM') as mes,
  function as funcion,
  count(*) as llamadas,
  round(avg(usd_estimated), 6) as usd_promedio_por_llamada,
  round(sum(usd_estimated), 4) as usd_total,
  round(avg(input_tokens)) as tokens_entrada_promedio,
  round(avg(output_tokens)) as tokens_salida_promedio,
  round(avg(cache_read_tokens)) as tokens_cache_promedio
from public.ai_usage
group by 1, 2
order by 1 desc, 2;

-- Costo por día (últimos 30 días).
select
  (created_at at time zone 'America/Santiago')::date as dia,
  count(*) as llamadas,
  round(sum(usd_estimated), 4) as usd_total
from public.ai_usage
where created_at > now() - interval '30 days'
group by 1
order by 1 desc;

-- Costo por usuario este mes (anónimo: solo el id).
select
  user_id,
  count(*) as llamadas,
  round(sum(usd_estimated), 4) as usd_total
from public.ai_usage
where created_at >= date_trunc('month', now() at time zone 'America/Santiago')
group by 1
order by 3 desc
limit 20;

-- Gasto de hoy contra el tope diario (DAILY_LIMIT_USD, por defecto US$0,25).
select round(public.ai_spend_since(date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'), 4)
  as usd_hoy;

-- Recetas con IA: cuántas veces se reutilizó cada receta del caché (cada uso extra fue gratis).
select
  count(*) as recetas_en_cache,
  coalesce(sum(uses), 0) as veces_entregadas,
  coalesce(sum(uses), 0) - count(*) as entregas_gratis
from public.generated_recipes;
