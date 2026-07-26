import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiFetch } from '../../src/lib/api';
import { apiFetch as authFetch, getToken } from '../../src/lib/auth';

type Variant = {
  id: string;
  name: string;
  price: number | string;
  stockQty?: number;
};

type Product = {
  id: string;
  slug: string;
  nameEn: string;
  descriptionEn?: string;
  basePrice: number | string;
  variants?: Variant[];
  vendor?: { id: string; slug: string; name: string } | null;
  relatedProducts?: Array<{
    id: string;
    slug: string;
    nameEn: string;
    basePrice: number | string;
  }>;
};

type Review = {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  user?: { firstName?: string; lastName?: string };
};

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState(0);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [note, setNote] = useState('');
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    void apiFetch(`/api/catalog/products/${id}`)
      .then(async (data) => {
        const p = data.product as Product;
        setProduct(p || null);
        const first = (p?.variants || [])[0];
        if (first) setVariantId(first.id);
        if (p?.id) {
          const r = await apiFetch(`/api/reviews/product/${p.id}`);
          setReviews(r.reviews || []);
          setAverage(Number(r.average || 0));
          if (getToken()) {
            try {
              const w = await authFetch('/api/wishlist/ids');
              setWishlisted((w.productIds || []).includes(p.id));
            } catch {
              setWishlisted(false);
            }
          }
        }
      })
      .catch(() => setNote('Could not load product'));
  }, [id]);

  async function addToCart() {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    if (!product) return;
    try {
      await authFetch('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          variantId,
          quantity: 1,
        }),
      });
      setNote('Added to cart');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Add failed');
    }
  }

  async function toggleWishlist() {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    if (!product) return;
    try {
      if (wishlisted) {
        await authFetch(`/api/wishlist/${product.id}`, { method: 'DELETE' });
        setWishlisted(false);
        setNote('Removed from wishlist');
      } else {
        await authFetch('/api/wishlist', {
          method: 'POST',
          body: JSON.stringify({ productId: product.id }),
        });
        setWishlisted(true);
        setNote('Saved to wishlist');
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Wishlist update failed');
    }
  }

  async function submitReview() {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    if (!product) return;
    try {
      await authFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          rating,
          title: title.trim() || undefined,
          body,
        }),
      });
      setTitle('');
      setBody('');
      const r = await apiFetch(`/api/reviews/product/${product.id}`);
      setReviews(r.reviews || []);
      setAverage(Number(r.average || 0));
      setNote('Review saved');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Review failed');
    }
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>{note || 'Loading…'}</Text>
      </View>
    );
  }

  const selected = (product.variants || []).find((v) => v.id === variantId);
  const price = selected ? Number(selected.price) : Number(product.basePrice);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>{product.nameEn}</Text>
      {product.vendor ? (
        <Pressable onPress={() => router.push(`/vendors/${product.vendor!.slug}`)}>
          <Text style={styles.vendor}>Sold by {product.vendor.name}</Text>
        </Pressable>
      ) : null}
      <Text style={styles.price}>{price.toFixed(2)} AED</Text>
      <Text style={styles.body}>
        {product.descriptionEn || 'Fresh harvested produce ready for delivery.'}
      </Text>
      {(product.variants || []).length > 0 ? (
        <View style={styles.variants}>
          <Text style={styles.section}>Pack / size</Text>
          {(product.variants || []).map((v) => (
            <Pressable
              key={v.id}
              style={[styles.chip, variantId === v.id && styles.chipActive]}
              onPress={() => setVariantId(v.id)}
            >
              <Text style={[styles.chipText, variantId === v.id && styles.chipTextActive]}>
                {v.name} · {Number(v.price).toFixed(2)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable style={styles.btn} onPress={() => void addToCart()}>
        <Text style={styles.btnText}>Add to cart</Text>
      </Pressable>
      <Pressable style={styles.wishBtn} onPress={() => void toggleWishlist()}>
        <Text style={styles.wishBtnText}>
          {wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        </Text>
      </Pressable>

      <Text style={[styles.section, { marginTop: 28 }]}>
        Reviews {reviews.length ? `· ${average.toFixed(1)}/5` : ''}
      </Text>
      <View style={styles.reviewBox}>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          maxLength={1}
          value={String(rating)}
          onChangeText={(v) => setRating(Math.min(5, Math.max(1, Number(v) || 5)))}
          placeholder="Rating 1-5"
        />
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Title (optional)"
          maxLength={120}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          multiline
          value={body}
          onChangeText={setBody}
          placeholder="Your review"
        />
        <Pressable style={styles.secondary} onPress={() => void submitReview()}>
          <Text style={styles.secondaryText}>Post review</Text>
        </Pressable>
      </View>
      {reviews.map((r) => (
        <View key={r.id} style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>
            {r.rating}/5 · {[r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || 'Customer'}
          </Text>
          {r.title ? <Text style={styles.reviewHeadline}>{r.title}</Text> : null}
          <Text style={styles.reviewBody}>{r.body}</Text>
        </View>
      ))}

      {(product.relatedProducts || []).length > 0 ? (
        <>
          <Text style={[styles.section, { marginTop: 28 }]}>You may also like</Text>
          {product.relatedProducts!.map((p) => (
            <Pressable
              key={p.id}
              style={styles.reviewCard}
              onPress={() => router.push(`/product/${p.slug}`)}
            >
              <Text style={styles.reviewTitle}>{p.nameEn}</Text>
              <Text style={styles.reviewBody}>{Number(p.basePrice).toFixed(2)} AED</Text>
            </Pressable>
          ))}
        </>
      ) : null}

      {note ? <Text style={styles.note}>{note}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: '700', color: '#14532d' },
  vendor: { marginTop: 6, color: '#0f766e', fontWeight: '600' },
  price: { marginTop: 8, fontSize: 18, fontWeight: '600', color: '#166534' },
  body: { marginTop: 14, color: '#64748b', lineHeight: 22 },
  section: { fontWeight: '600', color: '#334155', marginBottom: 8 },
  variants: { marginTop: 16 },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#0f766e', backgroundColor: '#f0fdfa' },
  chipText: { color: '#334155', fontWeight: '600' },
  chipTextActive: { color: '#0f766e' },
  btn: {
    marginTop: 24,
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  wishBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  wishBtnText: { color: '#0f766e', fontWeight: '700' },
  reviewBox: { marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: { color: '#0f766e', fontWeight: '700' },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  reviewTitle: { fontWeight: '700', color: '#0f172a' },
  reviewHeadline: { marginTop: 4, fontWeight: '600', color: '#334155' },
  reviewBody: { marginTop: 4, color: '#64748b' },
  note: { marginTop: 12, color: '#0f766e' },
});
