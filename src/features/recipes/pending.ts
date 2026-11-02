// Receta creada por la IA que el usuario está viendo y todavía no guarda.
import type { Recipe } from './recipes';

let pending: Recipe | null = null;

export const PENDING_AI_ID = 'ai-preview';

export function setPendingAiRecipe(recipe: Recipe | null): void {
  pending = recipe;
}

export function getPendingAiRecipe(): Recipe | null {
  return pending;
}
