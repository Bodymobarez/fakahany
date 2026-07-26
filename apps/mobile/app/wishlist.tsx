import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiFetch, getToken } from '../src/lib/auth';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

type Item = {
  id: string;
  product: {
    id: string;
    slug: string;
    nameEn: string;
    basePrice: number | string;
    images?: Array<{ url: string; isPrimary?: boolean }>;
  };
};

function mediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function WishlistScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const data = await apiFetch('/api/wishlist');
      setItems(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wishlist');
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(productId: string) {
    try {
      await apiFetch(`/api/wishlist/${productId}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed');
    }
  }

  async function addToCart(productId: string) {
    setBusyId(productId);
    setNote(null);
    setError(null);
    try {
      await apiFetch('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      setNote('Added to cart');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add to cart failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>Wishlist</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {items.length === 0 && !error ? <Text style={styles.empty}>No saved items.</Text> : null}
      {items.map((i) => {
        const img =
          mediaUrl(
            i.product.images?.find((x) => x.isPrimary)?.url || i.product.images?.[0]?.url,
          ) || null;
        return (
          <View key={i.id} style={styles.card}>
            <Link href={`/product/${i.product.slug || i.product.id}`} asChild>
              <Pressable style={styles.row}>
                {img ? <Image source={{ uri: img }} style={styles.thumb} /> : <View style={styles.thumbPlaceholder} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{i.product.nameEn}</Text>
                  <Text style={styles.price}>{Number(i.product.basePrice).toFixed(2)} AED</Text>
                </View>
              </Pressable>
            </Link>
            <View style={styles.actions}>
              <Pressable disabled={busyId === i.product.id} onPress={() => void addToCart(i.product.id)}>
                <Text style={styles.cart}>
                  {busyId === i.product.id ? 'Adding…' : 'Add to cart'}
                </Text>
              </Pressable>
              <Pressable onPress={() => void remove(i.product.id)}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <Pressable style={styles.link} onPress={() => router.back()}>
        <Text style={styles.linkText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  error: { color: '#b91c1c', marginBottom: 10 },
  note: { color: '#0f766e', marginBottom: 10, fontWeight: '600' },
  empty: { color: '#64748b' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#f1f5f9' },
  thumbPlaceholder: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#e2e8f0' },
  name: { fontWeight: '700', color: '#0f172a' },
  price: { marginTop: 4, color: '#0f766e', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  cart: { color: '#0f766e', fontWeight: '700' },
  remove: { color: '#b91c1c', fontWeight: '600' },
  link: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  linkText: { color: '#0f766e', fontWeight: '600' },
});
