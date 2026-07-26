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
import { apiFetch, getToken } from '../src/lib/auth';

type Tx = { id: string; type: string; amount: number | string; createdAt: string; note?: string };

export default function WalletScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [giftCode, setGiftCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
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
      const data = await apiFetch('/api/wallet/me');
      setBalance(Number(data.wallet?.balance || 0));
      setTxs(data.wallet?.transactions || data.transactions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wallet');
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function redeem() {
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch('/api/gift-cards/redeem', {
        method: 'POST',
        body: JSON.stringify({ code: giftCode.trim().toUpperCase() }),
      });
      setGiftCode('');
      setMessage(`Redeemed +${Number(data.credited).toFixed(2)} AED`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Redeem failed');
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>Wallet</Text>
      <Text style={styles.balance}>{balance.toFixed(2)} AED</Text>
      <Pressable style={styles.buyLink} onPress={() => router.push('/gift-cards')}>
        <Text style={styles.buyLinkText}>Buy a gift card →</Text>
      </Pressable>
      <View style={styles.giftRow}>
        <TextInput
          style={styles.input}
          placeholder="Gift code"
          autoCapitalize="characters"
          value={giftCode}
          onChangeText={(v) => setGiftCode(v.toUpperCase())}
        />
        <Pressable style={styles.giftBtn} onPress={() => void redeem()}>
          <Text style={styles.giftBtnText}>Redeem</Text>
        </Pressable>
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {txs.slice(0, 20).map((t) => (
        <View key={t.id} style={styles.row}>
          <Text style={styles.rowTitle}>{t.type}</Text>
          <Text style={styles.rowAmt}>{Number(t.amount).toFixed(2)}</Text>
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
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  balance: { marginTop: 8, fontSize: 28, fontWeight: '700', color: '#0f766e' },
  buyLink: { marginTop: 10, marginBottom: 4 },
  buyLinkText: { color: '#0f766e', fontWeight: '700' },
  giftRow: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 8 },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  giftBtn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  giftBtnText: { color: '#fff', fontWeight: '700' },
  message: { color: '#0f766e', marginBottom: 8 },
  error: { color: '#b91c1c', marginBottom: 8 },
  row: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowTitle: { color: '#334155', fontWeight: '600' },
  rowAmt: { color: '#0f172a', fontWeight: '700' },
  link: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  linkText: { color: '#0f766e', fontWeight: '600' },
});
