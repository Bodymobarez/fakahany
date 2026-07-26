import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch, getToken } from '../src/lib/auth';

export default function LoyaltyScreen() {
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState('Green');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setRefreshing(true);
    try {
      const data = await apiFetch('/api/loyalty/me');
      setPoints(Number(data.account?.points || 0));
      setLevel(data.account?.level?.name || 'Green');
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>Loyalty</Text>
      <Text style={styles.points}>{points} pts</Text>
      <Text style={styles.meta}>Level: {level} · 100 pts = 1 AED at checkout</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.link} onPress={() => router.back()}>
        <Text style={styles.linkText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  points: { marginTop: 12, fontSize: 32, fontWeight: '700', color: '#0f766e' },
  meta: { marginTop: 8, color: '#64748b' },
  error: { color: '#b91c1c', marginTop: 10 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#0f766e', fontWeight: '600' },
});
