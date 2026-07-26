import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../src/lib/auth';

export default function BnplScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    paymentId?: string;
    orderId?: string;
    orderNumber?: string;
    method?: string;
  }>();
  const method = (params.method || 'TABBY').toUpperCase();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    if (!params.paymentId) {
      setError('Missing payment');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/payments/confirm', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: params.paymentId,
          externalId: `${method.toLowerCase()}_confirmed_${params.orderId || params.paymentId}`,
        }),
      });
      router.replace(`/order/${params.orderId}` as `/order/${string}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confirm failed');
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    if (!params.paymentId) {
      router.replace('/(tabs)');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/api/payments/cancel', {
        method: 'POST',
        body: JSON.stringify({ paymentId: params.paymentId }),
      });
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Demo {method}</Text>
      <Text style={styles.title}>Complete your purchase</Text>
      <Text style={styles.body}>
        Approve to capture this BNPL sandbox payment, or cancel to abandon the order.
      </Text>
      {params.orderNumber ? (
        <Text style={styles.order}>Order {params.orderNumber}</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.btn} disabled={busy} onPress={() => void approve()}>
        <Text style={styles.btnText}>{busy ? 'Working…' : 'Approve payment'}</Text>
      </Pressable>
      <Pressable style={styles.secondary} disabled={busy} onPress={() => void decline()}>
        <Text style={styles.secondaryText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc', justifyContent: 'center' },
  eyebrow: { color: '#0f766e', fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  title: { marginTop: 8, fontSize: 26, fontWeight: '800', color: '#0f172a' },
  body: { marginTop: 10, color: '#64748b', lineHeight: 20 },
  order: {
    marginTop: 16,
    backgroundColor: '#ecfdf5',
    color: '#115e59',
    padding: 12,
    borderRadius: 12,
    fontWeight: '600',
  },
  error: { marginTop: 12, color: '#b91c1c' },
  btn: {
    marginTop: 24,
    backgroundColor: '#0f766e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  secondary: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryText: { color: '#0f172a', fontWeight: '600' },
});
