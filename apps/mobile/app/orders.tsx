import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch, getToken } from '../src/lib/auth';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number | string;
  createdAt: string;
};

const CANCELABLE = new Set(['PENDING', 'ACCEPTED', 'PREPARING']);
const RETURNABLE = new Set(['DELIVERED', 'OUT_FOR_DELIVERY', 'PACKED']);

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
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
      const data = await apiFetch('/api/orders');
      setOrders(data.orders || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancelOrder(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/api/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled from mobile app' }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setBusyId(null);
    }
  }

  async function returnOrder(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/api/orders/${id}/return`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Return requested from mobile app' }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Return failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>Orders</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {orders.length === 0 && !error ? (
        <Text style={styles.empty}>No orders yet.</Text>
      ) : null}
      {orders.map((o) => (
        <View key={o.id} style={styles.card}>
          <Text style={styles.number}>{o.orderNumber}</Text>
          <Text style={styles.meta}>
            {o.status} · {Number(o.total).toFixed(2)} AED
          </Text>
          <Text style={styles.date}>{new Date(o.createdAt).toLocaleString()}</Text>
          <View style={styles.row}>
            <Pressable style={styles.trackBtn} onPress={() => router.push(`/order/${o.id}`)}>
              <Text style={styles.trackText}>Details</Text>
            </Pressable>
            <Pressable style={styles.trackBtn} onPress={() => router.push(`/track/${o.id}`)}>
              <Text style={styles.trackText}>Track</Text>
            </Pressable>
            <Pressable
              style={styles.trackBtn}
              onPress={() => router.push(`/support?orderId=${encodeURIComponent(o.id)}`)}
            >
              <Text style={styles.trackText}>Help</Text>
            </Pressable>
            {CANCELABLE.has(o.status) ? (
              <Pressable
                style={styles.secondaryBtn}
                disabled={busyId === o.id}
                onPress={() =>
                  Alert.alert('Cancel order?', undefined, [
                    { text: 'No', style: 'cancel' },
                    { text: 'Yes', onPress: () => void cancelOrder(o.id) },
                  ])
                }
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            ) : null}
            {RETURNABLE.has(o.status) ? (
              <Pressable
                style={styles.secondaryBtn}
                disabled={busyId === o.id}
                onPress={() => void returnOrder(o.id)}
              >
                <Text style={styles.secondaryText}>Return</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
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
  error: { color: '#b91c1c', marginBottom: 10 },
  empty: { color: '#64748b' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
  },
  number: { fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, color: '#0f766e', fontWeight: '600' },
  date: { marginTop: 4, fontSize: 12, color: '#94a3b8' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  trackBtn: {
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  trackText: { color: '#0f766e', fontWeight: '700', fontSize: 12 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secondaryText: { color: '#334155', fontWeight: '600', fontSize: 12 },
  link: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  linkText: { color: '#0f766e', fontWeight: '600' },
});
