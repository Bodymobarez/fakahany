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

type GiftCard = {
  id: string;
  code: string;
  fullCode?: string | null;
  initialAmount: number | string;
  isActive: boolean;
  createdAt: string;
};

const AMOUNTS = [50, 100, 200, 500] as const;

export default function GiftCardsScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState<(typeof AMOUNTS)[number]>(100);
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'STRIPE'>('WALLET');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setRefreshing(true);
    try {
      const [mine, wallet] = await Promise.all([
        apiFetch('/api/gift-cards/mine'),
        apiFetch('/api/wallet/me'),
      ]);
      setCards(mine.cards || []);
      setBalance(Number(wallet.wallet?.balance || 0));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function purchase() {
    setBusy(true);
    setError(null);
    setIssuedCode(null);
    try {
      const data = await apiFetch('/api/gift-cards/purchase', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          paymentMethod,
          recipientEmail: recipientEmail.trim() || null,
        }),
      });
      setIssuedCode(data.card?.code || null);
      setRecipientEmail('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>Gift cards</Text>
      <Text style={styles.meta}>Wallet: {balance.toFixed(2)} AED</Text>

      <Text style={styles.section}>Buy a card</Text>
      <View style={styles.row}>
        {AMOUNTS.map((a) => (
          <Pressable
            key={a}
            style={[styles.chip, amount === a && styles.chipActive]}
            onPress={() => setAmount(a)}
          >
            <Text style={[styles.chipText, amount === a && styles.chipTextActive]}>{a}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        {(['WALLET', 'STRIPE'] as const).map((m) => (
          <Pressable
            key={m}
            style={[styles.chip, paymentMethod === m && styles.chipActive]}
            onPress={() => setPaymentMethod(m)}
          >
            <Text style={[styles.chipText, paymentMethod === m && styles.chipTextActive]}>
              {m === 'WALLET' ? 'Wallet' : 'Card (demo)'}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Recipient email (optional)"
        keyboardType="email-address"
        autoCapitalize="none"
        value={recipientEmail}
        onChangeText={setRecipientEmail}
      />
      <Pressable style={styles.btn} disabled={busy} onPress={() => void purchase()}>
        <Text style={styles.btnText}>{busy ? 'Purchasing…' : `Buy ${amount} AED`}</Text>
      </Pressable>

      {issuedCode ? (
        <View style={styles.issued}>
          <Text style={styles.issuedLabel}>Issued code</Text>
          <Text style={styles.issuedCode}>{issuedCode}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.section}>Your purchases</Text>
      {cards.map((c) => (
        <View key={c.id} style={styles.card}>
          <Text style={styles.code}>{c.fullCode || c.code}</Text>
          <Text style={styles.meta}>
            {Number(c.initialAmount).toFixed(0)} AED · {c.isActive ? 'Active' : 'Redeemed'}
          </Text>
        </View>
      ))}
      {!cards.length ? <Text style={styles.meta}>No cards yet.</Text> : null}

      <Pressable style={styles.link} onPress={() => router.push('/wallet')}>
        <Text style={styles.linkText}>Redeem in Wallet</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => router.back()}>
        <Text style={styles.linkText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, color: '#64748b', fontSize: 13 },
  section: { marginTop: 18, marginBottom: 8, fontWeight: '700', color: '#0f172a' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#0f766e', backgroundColor: '#ecfdf5' },
  chipText: { color: '#64748b', fontWeight: '600', fontSize: 12 },
  chipTextActive: { color: '#0f766e' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  btn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  issued: {
    marginTop: 12,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  issuedLabel: { color: '#115e59', fontSize: 12, fontWeight: '600' },
  issuedCode: { marginTop: 4, fontFamily: 'monospace', fontWeight: '800', color: '#0f172a' },
  error: { marginTop: 8, color: '#b91c1c' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  code: { fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' },
  link: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#0f766e', fontWeight: '600' },
});
