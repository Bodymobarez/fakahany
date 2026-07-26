import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiFetch } from '../src/lib/api';

type Faq = {
  id: string;
  questionEn: string;
  answerEn: string;
};

export default function FaqScreen() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await apiFetch('/api/content/faqs');
      setFaqs(data.faqs || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>FAQ</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {faqs.map((f) => (
        <Pressable
          key={f.id}
          style={styles.card}
          onPress={() => setOpenId(openId === f.id ? null : f.id)}
        >
          <Text style={styles.q}>{f.questionEn}</Text>
          {openId === f.id ? <Text style={styles.a}>{f.answerEn}</Text> : null}
        </Pressable>
      ))}
      {faqs.length === 0 && !error ? (
        <Text style={styles.meta}>No FAQs yet.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  error: { color: '#b91c1c', marginBottom: 8 },
  meta: { color: '#64748b' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 8,
  },
  q: { fontWeight: '700', color: '#0f172a' },
  a: { marginTop: 8, color: '#475569', lineHeight: 20 },
});
