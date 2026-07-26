import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../../src/lib/api';
import { apiFetch, getToken } from '../../src/lib/auth';

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number | string;
  shipping: number | string;
  tax: number | string;
  total: number | string;
  createdAt: string;
  address?: {
    label?: string;
    line1?: string;
    city?: string;
    emirate?: string;
  } | null;
  statusHistory?: Array<{ status: string; note?: string | null; createdAt: string }>;
  items: Array<{
    id: string;
    nameEn: string;
    sku: string;
    quantity: number;
    lineTotal: number | string;
  }>;
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setRefreshing(true);
    try {
      const data = await apiFetch(`/api/orders/${id}`);
      setOrder(data.order);
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

  async function downloadInvoice() {
    if (!order || !getToken()) return;
    try {
      const dest = `${FileSystem.cacheDirectory}invoice-${order.orderNumber}.pdf`;
      const result = await FileSystem.downloadAsync(
        `${API_URL}/api/orders/${order.id}/invoice`,
        dest,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Invoice ${order.orderNumber}`,
        });
      } else {
        Alert.alert('Invoice saved', result.uri);
      }
    } catch (e) {
      Alert.alert('Invoice failed', e instanceof Error ? e.message : 'Could not download');
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {order ? (
        <>
          <Text style={styles.title}>{order.orderNumber}</Text>
          <Text style={styles.meta}>
            {order.status} · {new Date(order.createdAt).toLocaleString()}
          </Text>
          {order.address ? (
            <Text style={styles.address}>
              {[order.address.label, order.address.line1, order.address.city, order.address.emirate]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
          {order.items.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.nameEn}</Text>
                <Text style={styles.sku}>
                  {item.sku} · qty {item.quantity}
                </Text>
              </View>
              <Text style={styles.amt}>{Number(item.lineTotal).toFixed(2)}</Text>
            </View>
          ))}
          <Text style={styles.total}>Total {Number(order.total).toFixed(2)} AED</Text>
          <Pressable style={styles.btn} onPress={() => router.push(`/track/${order.id}`)}>
            <Text style={styles.btnText}>Track delivery</Text>
          </Pressable>
          <Pressable style={styles.btnSecondary} onPress={() => void downloadInvoice()}>
            <Text style={styles.btnSecondaryText}>Download invoice PDF</Text>
          </Pressable>
          {(order.statusHistory || []).length > 0 ? (
            <>
              <Text style={styles.section}>Status history</Text>
              {(order.statusHistory || []).map((h, idx) => (
                <View key={`${h.status}-${idx}`} style={styles.history}>
                  <Text style={styles.historyTitle}>{h.status.replaceAll('_', ' ')}</Text>
                  <Text style={styles.historyMeta}>
                    {new Date(h.createdAt).toLocaleString()}
                    {h.note ? ` · ${h.note}` : ''}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
        </>
      ) : (
        !error && <Text style={styles.meta}>Loading…</Text>
      )}
      <Pressable style={styles.link} onPress={() => router.back()}>
        <Text style={styles.linkText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 6, color: '#64748b', marginBottom: 12 },
  address: { marginBottom: 12, color: '#334155', lineHeight: 20 },
  section: { marginTop: 20, marginBottom: 8, fontWeight: '700', color: '#0f172a' },
  history: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  historyTitle: { fontWeight: '700', color: '#0f172a' },
  historyMeta: { marginTop: 4, color: '#94a3b8', fontSize: 12 },
  error: { color: '#b91c1c', marginBottom: 10 },
  row: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  itemName: { fontWeight: '700', color: '#0f172a' },
  sku: { marginTop: 2, color: '#94a3b8', fontSize: 12 },
  amt: { fontWeight: '700', color: '#0f766e' },
  total: { marginTop: 10, fontSize: 18, fontWeight: '700', color: '#14532d' },
  btn: {
    marginTop: 16,
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  btnSecondary: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#0f766e', fontWeight: '700' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#0f766e', fontWeight: '600' },
});
