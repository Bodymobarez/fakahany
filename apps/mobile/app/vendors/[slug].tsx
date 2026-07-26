import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../../src/lib/api';

type Product = {
  id: string;
  slug: string;
  nameEn: string;
  basePrice: number | string;
};

type Vendor = {
  id: string;
  slug: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  products?: Product[];
};

export default function VendorDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [vRes, pRes] = await Promise.all([
        apiFetch(`/api/expansion/vendors/${slug}`),
        apiFetch(`/api/catalog/products?vendor=${encodeURIComponent(slug)}`),
      ]);
      setVendor(vRes.vendor);
      setProducts(pRes.products || vRes.vendor?.products || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vendor && !error) {
    return (
      <View style={styles.container}>
        <Text style={styles.meta}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {vendor ? (
        <>
          <Text style={styles.title}>{vendor.name}</Text>
          {vendor.phone ? <Text style={styles.meta}>{vendor.phone}</Text> : null}
          {vendor.email ? <Text style={styles.meta}>{vendor.email}</Text> : null}
          <Text style={styles.section}>Products</Text>
          {products.map((p) => (
            <Pressable
              key={p.id}
              style={styles.card}
              onPress={() => router.push(`/product/${p.slug}`)}
            >
              <Text style={styles.cardTitle}>{p.nameEn}</Text>
              <Text style={styles.price}>{Number(p.basePrice).toFixed(2)} AED</Text>
            </Pressable>
          ))}
          {products.length === 0 ? (
            <Text style={styles.meta}>No products from this vendor yet.</Text>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#14532d' },
  meta: { marginTop: 6, color: '#64748b' },
  error: { color: '#b91c1c', marginBottom: 8 },
  section: { marginTop: 22, marginBottom: 8, fontWeight: '700', color: '#0f172a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: { fontWeight: '700', color: '#0f172a', flex: 1 },
  price: { fontWeight: '700', color: '#0f766e' },
});
