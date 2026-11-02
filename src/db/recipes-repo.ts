import type { Recipe } from '@/features/recipes/recipes';

import { nowTimestamp, type Db } from './db';

export async function listUserRecipes(db: Db): Promise<Recipe[]> {
  const rows = await db.getAllAsync<{ json: string }>(
    'SELECT json FROM user_recipes ORDER BY created_at DESC',
  );
  const recipes: Recipe[] = [];
  for (const row of rows) {
    try {
      recipes.push(JSON.parse(row.json) as Recipe);
    } catch {
      // Una receta dañada no debe romper la lista.
    }
  }
  return recipes;
}

export async function saveUserRecipe(db: Db, recipe: Recipe): Promise<void> {
  await db.runAsync(
    `INSERT INTO user_recipes (id, source, json, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET json = excluded.json, source = excluded.source`,
    [recipe.id, recipe.source, JSON.stringify(recipe), nowTimestamp()],
  );
}

export async function deleteUserRecipe(db: Db, id: string): Promise<void> {
  await db.runAsync('DELETE FROM user_recipes WHERE id = ?', [id]);
}
