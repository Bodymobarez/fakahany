import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch, getToken } from '../../src/lib/auth';

type Assignment = {
  id: string;
  stopOrder?: number;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    deliveryOtp?: string | null;
    address?: { line1?: string; city?: string; emirate?: string };
  };
};

export default function AssignedOrdersScreen() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isOnline, setIsOnline] = useState(false);
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
      const [me, data] = await Promise.all([
        apiFetch('/api/driver/me'),
        apiFetch('/api/driver/assignments'),
      ]);
      setIsOnline(Boolean(me.driver?.isOnline));
      setAssignments(data.assignments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleDuty() {
    try {
      const next = !isOnline;
      const data = await apiFetch('/api/driver/me/online', {
        method: 'PATCH',
        body: JSON.stringify({ isOnline: next }),
      });
      setIsOnline(Boolean(data.driver?.isOnline));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update duty status');
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <View style={styles.dutyRow}>
        <View>
          <Text style={styles.meta}>Duty status</Text>
          <Text style={[styles.duty, isOnline ? styles.on : styles.off]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        <Pressable
          style={[styles.dutyBtn, isOnline ? styles.dutyBtnOff : styles.dutyBtnOn]}
          onPress={() => void toggleDuty()}
        >
          <Text style={styles.dutyBtnText}>{isOnline ? 'Go offline' : 'Go online'}</Text>
        </Pressable>
      </View>
      <Pressable style={styles.routeLink} onPress={() => router.push('/(tabs)/route')}>
        <Text style={styles.routeLinkText}>Open route map →</Text>
      </Pressable>
      <Text style={styles.meta}>Assigned deliveries</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {assignments.length === 0 && !error ? (
        <Text style={styles.empty}>No open assignments. Pull to refresh.</Text>
      ) : null}
      {assignments.map((a, idx) => (
        <Link key={a.id} href={`/order/${a.order.id}`} asChild>
          <Pressable style={styles.card}>
            <View style={styles.row}>
              <View style={styles.stopBadge}>
                <Text style={styles.stopText}>{a.stopOrder || idx + 1}</Text>
              </View>
              <Text style={styles.title}>{a.order.orderNumber}</Text>
            </View>
            <Text style={styles.sub}>
              {[a.order.address?.line1, a.order.address?.city, a.order.address?.emirate]
                .filter(Boolean)
                .join(', ') || 'Address pending'}
            </Text>
            <Text style={styles.badge}>{a.order.status}</Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  dutyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 14,
  },
  duty: { marginTop: 4, fontWeight: '800', fontSize: 16 },
  on: { color: '#0f766e' },
  off: { color: '#94a3b8' },
  dutyBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  dutyBtnOn: { backgroundColor: '#0f766e' },
  dutyBtnOff: { backgroundColor: '#334155' },
  dutyBtnText: { color: '#fff', fontWeight: '700' },
  routeLink: { marginBottom: 10 },
  routeLinkText: { color: '#0f766e', fontWeight: '700' },
  meta: { color: '#64748b', fontSize: 13, marginBottom: 10, fontWeight: '600' },
  empty: { color: '#94a3b8', marginTop: 24 },
  error: { color: '#b91c1c', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stopBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  title: { fontWeight: '700', fontSize: 16, color: '#0f172a' },
  sub: { marginTop: 4, color: '#64748b' },
  badge: { marginTop: 8, fontSize: 11, fontWeight: '700', color: '#0f766e' },
});
