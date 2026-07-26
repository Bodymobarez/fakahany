import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CategoryChips } from '../../src/components/CategoryChips';
import { ProductCard } from '../../src/components/ProductCard';
import {
  fetchCategories,
  fetchProducts,
  type Category,
  type Product,
} from '../../src/lib/catalog';
import { colors, spacing } from '../../src/theme';

/** Full catalog shop — parallel to web `/products`, separate from Home. */
export default function ShopScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [prods, cats] = await Promise.all([
        fetchProducts({ q, category }),
        fetchCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shop');
    } finally {
      setRefreshing(false);
    }
  }, [q, category]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Shop</Text>
      <Text style={styles.sub}>Browse farm-fresh produce</Text>
      <TextInput
        style={styles.search}
        placeholder="Search produce…"
        value={q}
        onChangeText={setQ}
        onSubmitEditing={() => void load()}
        returnKeyType="search"
      />
      <CategoryChips categories={categories} value={category} onChange={setCategory} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
      {products.length === 0 && !error ? (
        <Text style={styles.empty}>No products match. Pull to refresh.</Text>
      ) : null}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.brandSoft },
  title: { fontSize: 26, fontWeight: '800', color: colors.brandDark },
  sub: { marginTop: 4, marginBottom: 12, color: '#4d7c0f' },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  error: { color: colors.danger, marginBottom: 8 },
  empty: { color: colors.muted, marginTop: 20 },
});
