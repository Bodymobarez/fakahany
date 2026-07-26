import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiFetch, getToken } from '../../src/lib/auth';

type CartItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export default function CartScreen() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      setItems([]);
      setError('Sign in to view your cart.');
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const data = await apiFetch('/api/cart');
      setItems(data.cart?.items || []);
      setTotal(Number(data.cart?.total || 0));
      setCouponCode(data.cart?.coupon?.code || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cart');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setQty(itemId: string, quantity: number) {
    try {
      await apiFetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function removeItem(itemId: string) {
    try {
      await apiFetch(`/api/cart/items/${itemId}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed');
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>Cart</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!getToken() ? (
        <Pressable style={styles.btn} onPress={() => router.push('/login')}>
          <Text style={styles.btnText}>Sign in</Text>
        </Pressable>
      ) : null}
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.price}>{Number(item.lineTotal).toFixed(2)}</Text>
            <View style={styles.qtyRow}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => void setQty(item.id, Math.max(0, item.quantity - 1))}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qty}>{item.quantity}</Text>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => void setQty(item.id, item.quantity + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
              <Pressable onPress={() => void removeItem(item.id)}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}
      {items.length > 0 ? (
        <>
          <View style={styles.couponRow}>
            <TextInput
              style={[styles.couponInput, { flex: 1 }]}
              placeholder="FRESH10"
              autoCapitalize="characters"
              value={couponInput}
              onChangeText={setCouponInput}
            />
            <Pressable
              style={styles.couponBtn}
              onPress={() => {
                void (async () => {
                  try {
                    await apiFetch('/api/cart/coupon', {
                      method: 'POST',
                      body: JSON.stringify({ code: couponInput.trim() }),
                    });
                    setCouponInput('');
                    await load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Coupon failed');
                  }
                })();
              }}
            >
              <Text style={styles.btnText}>Apply</Text>
            </Pressable>
          </View>
          {couponCode ? (
            <Text style={styles.couponApplied}>Coupon {couponCode} applied</Text>
          ) : null}
          <Text style={styles.total}>Total: {total.toFixed(2)} AED</Text>
          <Pressable style={styles.btn} onPress={() => router.push('/checkout')}>
            <Text style={styles.btnText}>Checkout</Text>
          </Pressable>
        </>
      ) : getToken() && !error ? (
        <Text style={styles.empty}>Your cart is empty.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  error: { color: '#b91c1c', marginBottom: 10 },
  empty: { color: '#64748b', marginTop: 12 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  name: { color: '#0f172a', fontWeight: '600' },
  price: { marginTop: 4, fontWeight: '600', color: '#0f766e' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  qtyBtnText: { fontSize: 18, color: '#0f172a' },
  qty: { minWidth: 24, textAlign: 'center', fontWeight: '600' },
  remove: { marginLeft: 8, color: '#b91c1c', fontSize: 13 },
  couponRow: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'center' },
  couponInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  couponBtn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  couponApplied: { marginTop: 8, color: '#0f766e', fontWeight: '600' },
  total: { marginTop: 16, fontSize: 18, fontWeight: '700', color: '#14532d' },
  btn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
