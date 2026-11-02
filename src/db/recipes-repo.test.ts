import { getBaseRecipe } from '@/features/recipes/recipes';

import { deleteUserRecipe, listUserRecipes, saveUserRecipe } from './recipes-repo';
import { createMigratedDb } from './test-db';

describe('recetas propias', () => {
  it('guarda, actualiza, lista y borra', async () => {
    const db = await createMigratedDb();
    const base = getBaseRecipe('charquican');
    if (!base) {
      throw new Error('falta charquican');
    }
    const mine = { ...base, id: 'u:1', t: 'Charquicán de la abuela', source: 'user' as const };
    await saveUserRecipe(db, mine);
    await saveUserRecipe(db, { ...mine, s: 6 });
    const list = await listUserRecipes(db);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ t: 'Charquicán de la abuela', s: 6, source: 'user' });
    await deleteUserRecipe(db, 'u:1');
    expect(await listUserRecipes(db)).toEqual([]);
  });
});
