import { formatProductMeasure } from '@fv/shared';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Product } from '../lib/catalog';
import { colors, spacing } from '../theme';

export function ProductCard({ product }: { product: Product }) {
  const measure = formatProductMeasure({
    soldAs: product.soldAs,
    weight: product.weight,
    unit: product.unit,
    packageSize: product.packageSize,
  });

  return (
    <Link href={`/product/${product.slug || product.id}`} asChild>
      <Pressable style={styles.card}>
        <Text style={styles.title}>{product.nameEn}</Text>
        <View style={styles.row}>
          <Text style={styles.measure}>{measure || '—'}</Text>
          <Text style={styles.price}>{Number(product.basePrice).toFixed(2)} AED</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  title: { fontWeight: '700', color: colors.brandDark, fontSize: 16 },
  row: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  measure: { color: colors.muted, fontSize: 13 },
  price: { color: colors.brand, fontWeight: '600' },
});
