import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch, getToken } from '../../src/lib/auth';

type LedgerRow = {
  assignmentId: string;
  orderNumber: string;
  deliveredAt?: string | null;
  shipping: number;
  payout: number;
};

type Earnings = {
  today: number;
  week: number;
  month: number;
  allTime: number;
  deliveriesToday: number;
  deliveriesWeek: number;
  deliveriesMonth: number;
  deliveriesTotal: number;
  rule?: string;
  ledger?: LedgerRow[];
};

export default function EarningsScreen() {
  const router = useRouter();
  const [data, setData] = useState<Earnings | null>(null);
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
      const res = await apiFetch('/api/driver/earnings');
      setData(res);
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
      <Text style={styles.label}>Today</Text>
      <Text style={styles.amount}>
        {data ? data.today.toFixed(2) : '0.00'} <Text style={styles.currency}>AED</Text>
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>This week</Text>
          <Text style={styles.cardValue}>{data ? data.week.toFixed(2) : '0.00'}</Text>
          <Text style={styles.cardMeta}>{data?.deliveriesWeek ?? 0} drops</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>This month</Text>
          <Text style={styles.cardValue}>{data ? data.month.toFixed(2) : '0.00'}</Text>
          <Text style={styles.cardMeta}>{data?.deliveriesMonth ?? 0} drops</Text>
        </View>
      </View>

      <Text style={styles.body}>
        {data
          ? `${data.deliveriesToday} today · ${data.deliveriesTotal} all-time · all-time pay ${data.allTime.toFixed(2)} AED`
          : 'Pull to refresh earnings.'}
      </Text>
      <Text style={styles.hint}>{data?.rule || 'Payout from completed deliveries.'}</Text>

      <Text style={styles.section}>Recent payouts</Text>
      {(data?.ledger || []).map((row) => (
        <View key={row.assignmentId} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{row.orderNumber}</Text>
            <Text style={styles.rowMeta}>
              {row.deliveredAt ? new Date(row.deliveredAt).toLocaleString() : '—'} · fee{' '}
              {row.shipping.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.rowPay}>+{row.payout.toFixed(2)}</Text>
        </View>
      ))}
      {data && !(data.ledger || []).length ? (
        <Text style={styles.hint}>No completed deliveries yet.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  label: { color: '#64748b', fontSize: 13 },
  amount: { marginTop: 6, fontSize: 32, fontWeight: '700', color: '#0f172a' },
  currency: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  grid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  cardLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  cardValue: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#0f766e' },
  cardMeta: { marginTop: 2, color: '#94a3b8', fontSize: 11 },
  body: { marginTop: 16, color: '#64748b', lineHeight: 22 },
  hint: { marginTop: 8, color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  section: { marginTop: 22, marginBottom: 8, fontWeight: '700', color: '#0f172a' },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { fontWeight: '700', color: '#0f172a' },
  rowMeta: { marginTop: 2, color: '#94a3b8', fontSize: 12 },
  rowPay: { fontWeight: '800', color: '#0f766e' },
  error: { marginTop: 8, color: '#b91c1c' },
});
