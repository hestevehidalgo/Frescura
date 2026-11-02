import { useMemo } from 'react';

import { DEFAULT_SETTINGS } from '@/db/settings-repo';
import { useActiveItems, useAllRecipes, useSettings, useToday } from '@/features/inventory/store';

import { rankRecipes, type RankedRecipe, type RecipePreferences } from './ranking';
import type { Recipe } from './recipes';

/** Recetas ordenadas para el inventario y las preferencias actuales. */
export function useRankedRecipes(): {
  ranked: RankedRecipe[];
  recipes: Recipe[];
  prefs: RecipePreferences;
  loading: boolean;
} {
  const today = useToday();
  const { data: items } = useActiveItems();
  const { data: recipes } = useAllRecipes();
  const { data: settings } = useSettings();

  const prefs = useMemo<RecipePreferences>(() => {
    const s = settings ?? DEFAULT_SETTINGS;
    return {
      diet: s.diet,
      avoid: s.avoidAllergens,
      equipment: s.equipment,
      pantryBasics: s.pantryBasics,
    };
  }, [settings]);

  const ranked = useMemo(
    () => rankRecipes(recipes ?? [], items ?? [], today, prefs),
    [recipes, items, today, prefs],
  );

  return {
    ranked,
    recipes: recipes ?? [],
    prefs,
    loading: items === undefined || recipes === undefined,
  };
}
