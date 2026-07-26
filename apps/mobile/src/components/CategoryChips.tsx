import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { Category } from '../lib/catalog';
import { colors } from '../theme';

export function CategoryChips({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (slug: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
      <Pressable
        style={[styles.chip, !value && styles.chipActive]}
        onPress={() => onChange('')}
      >
        <Text style={[styles.text, !value && styles.textActive]}>All</Text>
      </Pressable>
      {categories.map((c) => (
        <Pressable
          key={c.slug}
          style={[styles.chip, value === c.slug && styles.chipActive]}
          onPress={() => onChange(c.slug)}
        >
          <Text style={[styles.text, value === c.slug && styles.textActive]}>{c.nameEn}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 12, maxHeight: 44 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
  text: { color: colors.brandDark, fontWeight: '600', fontSize: 13 },
  textActive: { color: '#fff' },
});
