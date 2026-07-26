import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiFetch } from '../../src/lib/api';

type Recipe = {
  id: string;
  slug: string;
  titleEn: string;
  prepMinutes?: number | null;
};

export default function RecipesScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await apiFetch('/api/content/recipes');
      setRecipes(data.recipes || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>Recipes</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {recipes.map((r) => (
        <Link key={r.id} href={`/recipes/${r.slug}`} asChild>
          <Pressable style={styles.card}>
            <Text style={styles.cardTitle}>{r.titleEn}</Text>
            {r.prepMinutes != null ? (
              <Text style={styles.meta}>{r.prepMinutes} min</Text>
            ) : null}
          </Pressable>
        </Link>
      ))}
      {recipes.length === 0 && !error ? (
        <Text style={styles.meta}>No recipes yet. Pull to refresh.</Text>
      ) : null}
      <Pressable style={styles.link} onPress={() => router.back()}>
        <Text style={styles.linkText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  error: { color: '#b91c1c', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 8,
  },
  cardTitle: { fontWeight: '700', color: '#14532d' },
  meta: { marginTop: 4, color: '#64748b', fontSize: 13 },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#0f766e', fontWeight: '600' },
});
