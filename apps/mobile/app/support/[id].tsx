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
import { apiFetch, getToken } from '../../src/lib/auth';

type Reply = {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
};

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  replies: Reply[];
};

export default function SupportTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setRefreshing(true);
    try {
      const data = await apiFetch(`/api/support/tickets/${id}`);
      setTicket(data.ticket);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setRefreshing(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    try {
      await apiFetch(`/api/support/tickets/${id}/replies`, {
        method: 'POST',
        body: JSON.stringify({ body: reply }),
      });
      setReply('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reply failed');
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {ticket ? (
        <>
          <Text style={styles.title}>{ticket.subject}</Text>
          <Text style={styles.meta}>{ticket.status}</Text>
          <View style={styles.bubble}>
            <Text style={styles.bubbleLabel}>You</Text>
            <Text style={styles.bubbleBody}>{ticket.message}</Text>
          </View>
          {ticket.replies.map((r) => (
            <View
              key={r.id}
              style={[styles.bubble, r.isStaff ? styles.staff : null]}
            >
              <Text style={styles.bubbleLabel}>{r.isStaff ? 'Support' : 'You'}</Text>
              <Text style={styles.bubbleBody}>{r.body}</Text>
              <Text style={styles.time}>{new Date(r.createdAt).toLocaleString()}</Text>
            </View>
          ))}
          {ticket.status !== 'CLOSED' ? (
            <>
              <TextInput
                style={[styles.input, { height: 90 }]}
                multiline
                placeholder="Write a reply…"
                value={reply}
                onChangeText={setReply}
              />
              <Pressable style={styles.btn} onPress={() => void send()}>
                <Text style={styles.btnText}>Send reply</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.meta}>This ticket is closed.</Text>
          )}
        </>
      ) : (
        !error && <Text style={styles.meta}>Loading…</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 6, marginBottom: 12, color: '#64748b' },
  error: { color: '#b91c1c', marginBottom: 8 },
  bubble: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  staff: { backgroundColor: '#f0fdfa', borderColor: '#99f6e4' },
  bubbleLabel: { fontWeight: '700', color: '#0f766e', marginBottom: 4 },
  bubbleBody: { color: '#334155', lineHeight: 20 },
  time: { marginTop: 6, fontSize: 11, color: '#94a3b8' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  btn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
