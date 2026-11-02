import { StyleSheet, View } from 'react-native';

import { Chip, ChipRow } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import type { Settings } from '@/db/settings-repo';
import { getCatalogProduct } from '@/features/catalog/catalog';
import { t } from '@/i18n';
import { spacing } from '@/theme';

import { ALLERGENS, DIETS, EQUIPMENT } from '../recipes';

/** Básicos de despensa que se ofrecen como "siempre tengo". */
export const PANTRY_OPTIONS = [
  'sal',
  'aceite',
  'azucar',
  'harina',
  'ajo',
  'cebolla',
  'arroz',
  'fideos',
  'huevos',
  'caldo',
  'salsa-tomate',
  'mantequilla',
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

type Props = {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
};

export function DietChips({ settings, onChange }: Props) {
  return (
    <ChipRow>
      {DIETS.map((diet) => (
        <Chip
          key={diet}
          label={t(`diets.${diet}`)}
          selected={settings.diet === diet}
          onPress={() => onChange({ diet })}
        />
      ))}
    </ChipRow>
  );
}

export function AllergenChips({ settings, onChange }: Props) {
  return (
    <View style={styles.gap}>
      <ChipRow>
        {ALLERGENS.map((allergen) => (
          <Chip
            key={allergen}
            label={t(`allergens.${allergen}`)}
            selected={settings.avoidAllergens.includes(allergen)}
            onPress={() => onChange({ avoidAllergens: toggle(settings.avoidAllergens, allergen) })}
          />
        ))}
      </ChipRow>
      <ThemedText variant="muted" style={styles.small}>
        {t('recipes.allergenNote')}
      </ThemedText>
    </View>
  );
}

export function EquipmentChips({ settings, onChange }: Props) {
  return (
    <ChipRow>
      {EQUIPMENT.map((equipment) => (
        <Chip
          key={equipment}
          label={t(`equipment.${equipment}`)}
          selected={settings.equipment.includes(equipment)}
          onPress={() => onChange({ equipment: toggle(settings.equipment, equipment) })}
        />
      ))}
    </ChipRow>
  );
}

export function PantryChips({ settings, onChange }: Props) {
  return (
    <ChipRow>
      {PANTRY_OPTIONS.map((id) => {
        const product = getCatalogProduct(id);
        return product ? (
          <Chip
            key={id}
            label={`${product.emoji} ${product.name}`}
            selected={settings.pantryBasics.includes(id)}
            onPress={() => onChange({ pantryBasics: toggle(settings.pantryBasics, id) })}
          />
        ) : null;
      })}
    </ChipRow>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  small: { fontSize: 14, lineHeight: 20 },
});
