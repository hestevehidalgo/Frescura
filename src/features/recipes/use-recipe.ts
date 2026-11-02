import { useMemo } from 'react';

import { DEFAULT_SETTINGS } from '@/db/settings-repo';
import { useActiveItems, useAllRecipes, useSettings, useToday } from '@/features/inventory/store';

import { getPendingAiRecipe, PENDING_AI_ID } from './pending';
import { scoreRecipe, type RankedRecipe } from './ranking';
import type { Recipe } from './recipes';

/**
 * Una receta por id (del recetario, propia, guardada o la de IA recién creada), con lo que tienes
 * y lo que falta. `recipe` es undefined mientras carga y null si no existe.
 */
export function useRecipe(id: string): {
  recipe: Recipe | null | undefined;
  ranked: RankedRecipe | null;
  saved: boolean;
} {
  const today = useToday();
  const { data: recipes } = useAllRecipes();
  const { data: items } = useActiveItems();
  const { data: settings } = useSettings();

  const recipe =
    id === PENDING_AI_ID
      ? getPendingAiRecipe()
      : recipes === undefined
        ? undefined
        : (recipes.find((r) => r.id === id) ?? null);

  const ranked = useMemo(
    () =>
      recipe && items
        ? scoreRecipe(recipe, items, today, (settings ?? DEFAULT_SETTINGS).pantryBasics)
        : null,
    [recipe, items, today, settings],
  );

  return { recipe, ranked, saved: id !== PENDING_AI_ID };
}
