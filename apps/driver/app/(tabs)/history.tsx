import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch, getToken } from '../../src/lib/auth';

type Row = {
  id: string;
  deliveredAt: string | null;
  order: { orderNumber: string; total: number | string; status: string };
  zone?: { name?: string } | null;
};

export default function HistoryScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const data = await apiFetch('/api/driver/history');
      setRows(data.assignments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>Delivery history</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {rows.length === 0 && !error ? (
        <Text style={styles.body}>No completed deliveries yet.</Text>
      ) : null}
      {rows.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.cardTitle}>{r.order.orderNumber}</Text>
          <Text style={styles.sub}>
            {r.zone?.name || 'Zone'} · {r.order.status}
          </Text>
          <Text style={styles.meta}>
            {r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : '—'}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  body: { marginTop: 10, color: '#64748b' },
  error: { color: '#b91c1c', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  cardTitle: { fontWeight: '700', color: '#0f172a' },
  sub: { marginTop: 4, color: '#64748b', fontSize: 13 },
  meta: { marginTop: 6, color: '#94a3b8', fontSize: 12 },
});
