import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { apiFetch } from '../../src/lib/api';

type Post = {
  id: string;
  slug: string;
  titleEn: string;
  excerptEn?: string | null;
};

export default function BlogScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await apiFetch('/api/content/blog');
      setPosts(data.posts || []);
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
      <Text style={styles.title}>Blog</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {posts.map((p) => (
        <Link key={p.id} href={`/blog/${p.slug}`} asChild>
          <Pressable style={styles.card}>
            <Text style={styles.cardTitle}>{p.titleEn}</Text>
            {p.excerptEn ? <Text style={styles.meta}>{p.excerptEn}</Text> : null}
          </Pressable>
        </Link>
      ))}
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
  meta: { marginTop: 6, color: '#64748b', fontSize: 13 },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#0f766e', fontWeight: '600' },
});
