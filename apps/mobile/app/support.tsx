import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { apiFetch, getToken } from '../src/lib/auth';

type Ticket = { id: string; subject: string; status: string; createdAt: string };
type OrderOpt = { id: string; orderNumber: string };

export default function SupportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<OrderOpt[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setRefreshing(true);
    try {
      const [ticketsRes, ordersRes] = await Promise.all([
        apiFetch('/api/support/tickets'),
        apiFetch('/api/orders'),
      ]);
      setTickets(ticketsRes.tickets || []);
      setOrders(
        (ordersRes.orders || []).map((o: OrderOpt) => ({
          id: o.id,
          orderNumber: o.orderNumber,
        })),
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const fromQuery = typeof params.orderId === 'string' ? params.orderId : '';
    if (fromQuery) {
      setOrderId(fromQuery);
      setSubject((s) => s || 'Help with my order');
    }
  }, [params.orderId]);

  async function create() {
    try {
      await apiFetch('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          message,
          orderId: orderId || null,
        }),
      });
      setSubject('');
      setMessage('');
      setOrderId('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>Support</Text>
      <Text style={styles.label}>Related order (optional)</Text>
      <View style={styles.orderList}>
        <Pressable
          style={[styles.orderChip, !orderId && styles.orderChipActive]}
          onPress={() => setOrderId('')}
        >
          <Text style={[styles.orderChipText, !orderId && styles.orderChipTextActive]}>
            No order
          </Text>
        </Pressable>
        {orders.map((o) => (
          <Pressable
            key={o.id}
            style={[styles.orderChip, orderId === o.id && styles.orderChipActive]}
            onPress={() => setOrderId(o.id)}
          >
            <Text
              style={[styles.orderChipText, orderId === o.id && styles.orderChipTextActive]}
            >
              {o.orderNumber}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.input} placeholder="Subject" value={subject} onChangeText={setSubject} />
      <TextInput
        style={[styles.input, { height: 90 }]}
        placeholder="Message"
        multiline
        value={message}
        onChangeText={setMessage}
      />
      <Pressable style={styles.btn} onPress={() => void create()}>
        <Text style={styles.btnText}>Open ticket</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {tickets.map((t) => (
        <Pressable
          key={t.id}
          style={styles.card}
          onPress={() => router.push(`/support/${t.id}`)}
        >
          <Text style={styles.cardTitle}>{t.subject}</Text>
          <Text style={styles.meta}>
            {t.status} · {new Date(t.createdAt).toLocaleString()}
          </Text>
        </Pressable>
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
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
  orderList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  orderChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  orderChipActive: { borderColor: '#0f766e', backgroundColor: '#ecfdf5' },
  orderChipText: { color: '#64748b', fontWeight: '600', fontSize: 12 },
  orderChipTextActive: { color: '#0f766e' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  btn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  error: { color: '#b91c1c', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, color: '#64748b', fontSize: 12 },
  link: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#0f766e', fontWeight: '600' },
});
