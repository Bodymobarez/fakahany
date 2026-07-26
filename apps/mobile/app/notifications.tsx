import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch, getToken } from '../src/lib/auth';

type Notification = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setRefreshing(true);
    try {
      const data = await apiFetch('/api/notifications');
      setItems(data.notifications || []);
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

  async function markRead(id: string) {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'POST', body: '{}' });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  async function markAll() {
    await apiFetch('/api/notifications/read-all', { method: 'POST', body: '{}' });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Pressable onPress={() => void markAll()}>
          <Text style={styles.linkText}>Mark all</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items.length === 0 && !error ? <Text style={styles.empty}>No notifications.</Text> : null}
      {items.map((n) => (
        <Pressable key={n.id} style={styles.card} onPress={() => void markRead(n.id)}>
          <Text style={[styles.cardTitle, !n.isRead && styles.unread]}>{n.title}</Text>
          <Text style={styles.body}>{n.body}</Text>
          <Text style={styles.meta}>{new Date(n.createdAt).toLocaleString()}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  error: { color: '#b91c1c', marginTop: 10 },
  empty: { color: '#64748b', marginTop: 12 },
  card: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  cardTitle: { fontWeight: '600', color: '#334155' },
  unread: { fontWeight: '800', color: '#0f172a' },
  body: { marginTop: 4, color: '#64748b' },
  meta: { marginTop: 6, fontSize: 11, color: '#94a3b8' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#0f766e', fontWeight: '600' },
});
