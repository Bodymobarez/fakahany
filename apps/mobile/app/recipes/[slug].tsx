import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../../src/lib/api';
import { apiFetch as authFetch, getToken } from '../../src/lib/auth';

type RecipeItem = {
  id: string;
  quantity: string;
  product: { id: string; slug: string; nameEn: string; basePrice: number | string };
};

type Recipe = {
  id: string;
  slug: string;
  titleEn: string;
  bodyEn?: string | null;
  prepMinutes?: number | null;
  items: RecipeItem[];
};

export default function RecipeDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/content/recipes/${slug}`);
      setRecipe(data.recipe);
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Failed');
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addAll() {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    if (!recipe?.items?.length) return;
    try {
      for (const item of recipe.items) {
        await authFetch('/api/cart/items', {
          method: 'POST',
          body: JSON.stringify({ productId: item.product.id, quantity: 1 }),
        });
      }
      setNote('Ingredients added to cart');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Add failed');
    }
  }

  if (!recipe) {
    return (
      <View style={styles.container}>
        <Text style={styles.meta}>{note || 'Loading…'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>{recipe.titleEn}</Text>
      {recipe.prepMinutes != null ? (
        <Text style={styles.meta}>{recipe.prepMinutes} minutes</Text>
      ) : null}
      <Text style={styles.body}>{recipe.bodyEn || ''}</Text>
      <Text style={styles.section}>Ingredients</Text>
      {recipe.items.map((item) => (
        <Pressable
          key={item.id}
          style={styles.card}
          onPress={() => router.push(`/product/${item.product.slug}`)}
        >
          <Text style={styles.cardTitle}>{item.product.nameEn}</Text>
          <Text style={styles.meta}>
            {item.quantity} · {Number(item.product.basePrice).toFixed(2)} AED
          </Text>
        </Pressable>
      ))}
      {recipe.items.length ? (
        <Pressable style={styles.btn} onPress={() => void addAll()}>
          <Text style={styles.btnText}>Add ingredients to cart</Text>
        </Pressable>
      ) : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#14532d' },
  meta: { marginTop: 6, color: '#64748b' },
  body: { marginTop: 14, color: '#475569', lineHeight: 22 },
  section: { marginTop: 22, marginBottom: 8, fontWeight: '700', color: '#0f172a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { fontWeight: '700', color: '#0f172a' },
  btn: {
    marginTop: 16,
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  note: { marginTop: 12, color: '#0f766e' },
});
