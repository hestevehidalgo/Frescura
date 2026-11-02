-- Fase 3: caché compartido de recetas generadas por IA.
-- La llave es el hash del conjunto de ingredientes + filtros (dieta, alergias, equipamiento,
-- porciones). Si otra persona pide lo mismo, se entrega la receta guardada sin pagar de nuevo.
-- No se guarda quién la pidió.

create table if not exists public.generated_recipes (
  cache_key text primary key,
  recipe jsonb not null,
  uses integer not null default 1,
  created_at timestamptz not null default now()
);

-- Row Level Security sin políticas: solo la Edge Function (con la clave secreta) la usa.
alter table public.generated_recipes enable row level security;
