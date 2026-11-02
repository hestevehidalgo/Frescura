import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Button, Chip, ChipRow } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/undo-toast';
import { useDb } from '@/db/provider';
import { saveUserRecipe } from '@/db/recipes-repo';
import { notifyRecipesChanged } from '@/features/inventory/store';
import { buildUserRecipe } from '@/features/recipes/user-recipe';
import { t } from '@/i18n';
import { MIN_TOUCH, radius, spacing, useThemeColors } from '@/theme';

const SERVINGS = [1, 2, 3, 4, 6, 8];

function Field({ label, multiline, ...input }: TextInputProps & { label: string }) {
  const c = useThemeColors();
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        {...input}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={c.textMuted}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: c.text, backgroundColor: c.surface, borderColor: c.border },
        ]}
      />
    </View>
  );
}

/** Escribir una receta propia. Los ingredientes se enlazan solos con el catálogo. */
export default function RecipeEditorScreen() {
  const c = useThemeColors();
  const db = useDb();
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [servings, setServings] = useState(2);
  const [ingredientsText, setIngredientsText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [invalid, setInvalid] = useState(false);

  const save = async () => {
    const recipe = buildUserRecipe(
      { title, servings, ingredientsText, stepsText },
      `user-${Date.now().toString(36)}`,
    );
    if (!recipe) {
      setInvalid(true);
      return;
    }
    await saveUserRecipe(db, recipe);
    notifyRecipesChanged();
    toast(t('recipes.saved'));
    router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } });
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Field
        label={t('editor.name')}
        placeholder={t('editor.namePlaceholder')}
        value={title}
        onChangeText={setTitle}
        maxLength={80}
      />
      <View style={styles.field}>
        <ThemedText style={styles.label}>{t('editor.servings')}</ThemedText>
        <ChipRow>
          {SERVINGS.map((n) => (
            <Chip
              key={n}
              label={String(n)}
              selected={servings === n}
              onPress={() => setServings(n)}
            />
          ))}
        </ChipRow>
      </View>
      <Field
        label={t('editor.ingredients')}
        placeholder={t('editor.ingredientsPlaceholder')}
        value={ingredientsText}
        onChangeText={setIngredientsText}
        multiline
      />
      <Field
        label={t('editor.steps')}
        placeholder={t('editor.stepsPlaceholder')}
        value={stepsText}
        onChangeText={setStepsText}
        multiline
      />
      {invalid && <ThemedText style={{ color: c.dangerFg }}>{t('editor.invalid')}</ThemedText>}
      <Button label={t('recipes.saveRecipe')} icon="checkmark" onPress={() => void save()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  field: { gap: spacing.xs },
  label: { fontWeight: '600' },
  input: {
    minHeight: MIN_TOUCH + 4,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 17,
  },
  multiline: { minHeight: 140, paddingTop: spacing.sm, paddingBottom: spacing.sm },
});
