import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiFetch, getToken } from '../src/lib/auth';

type Sub = {
  id: string;
  planCode: string;
  status: string;
  startsAt: string;
  meta?: {
    nextRunAt?: string;
    productIds?: string[];
    addressId?: string | null;
    lastOrderNumber?: string;
  } | null;
};
type Product = { id: string; nameEn: string; sku: string; isFeatured?: boolean };
type Address = {
  id: string;
  label?: string | null;
  area: string;
  emirate: string;
  isDefault?: boolean;
};

const PLANS = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;

export default function SubscriptionsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Sub[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [plan, setPlan] = useState<(typeof PLANS)[number]>('WEEKLY');
  const [selected, setSelected] = useState<string[]>([]);
  const [addressId, setAddressId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setRefreshing(true);
    try {
      const [subs, catalog, addrs] = await Promise.all([
        apiFetch('/api/expansion/subscriptions'),
        apiFetch('/api/catalog/products?limit=40'),
        apiFetch('/api/addresses'),
      ]);
      setItems(subs.subscriptions || []);
      const list = (catalog.products || []) as Product[];
      setProducts(list);
      const a = (addrs.addresses || []) as Address[];
      setAddresses(a);
      if (!editingId) {
        setAddressId((prev) => prev || a.find((x) => x.isDefault)?.id || a[0]?.id || '');
        setSelected((prev) => {
          if (prev.length) return prev;
          const featured = list.filter((p) => p.isFeatured).slice(0, 3);
          return (featured.length ? featured : list.slice(0, 3)).map((p) => p.id);
        });
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setRefreshing(false);
    }
  }, [router, editingId]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 8) return prev;
      return [...prev, id];
    });
  }

  function startEdit(s: Sub) {
    setEditingId(s.id);
    setPlan((s.planCode as (typeof PLANS)[number]) || 'WEEKLY');
    setSelected(s.meta?.productIds || []);
    setAddressId(s.meta?.addressId || addressId);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function save() {
    if (!selected.length || !addressId) {
      setError('Pick products and an address');
      return;
    }
    try {
      if (editingId) {
        await apiFetch(`/api/expansion/subscriptions/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({ productIds: selected, addressId }),
        });
        setEditingId(null);
      } else {
        await apiFetch('/api/expansion/subscriptions', {
          method: 'POST',
          body: JSON.stringify({ planCode: plan, productIds: selected, addressId }),
        });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : editingId ? 'Update failed' : 'Subscribe failed');
    }
  }

  async function cancel(id: string) {
    try {
      await apiFetch(`/api/expansion/subscriptions/${id}/cancel`, { method: 'POST', body: '{}' });
      if (editingId === id) cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>Subscriptions</Text>
      <Text style={styles.hint}>
        {editingId
          ? 'Update box contents and delivery address.'
          : 'Build a box, choose address, cycles run automatically.'}
      </Text>
      {editingId ? (
        <Pressable onPress={cancelEdit} style={{ marginBottom: 8 }}>
          <Text style={styles.linkText}>Cancel edit</Text>
        </Pressable>
      ) : (
        <View style={styles.row}>
          {PLANS.map((p) => (
            <Pressable
              key={p}
              style={[styles.chip, plan === p && styles.chipActive]}
              onPress={() => setPlan(p)}
            >
              <Text style={[styles.chipText, plan === p && styles.chipTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.section}>Delivery address</Text>
      {addresses.map((a) => (
        <Pressable
          key={a.id}
          style={[styles.addr, addressId === a.id && styles.addrActive]}
          onPress={() => setAddressId(a.id)}
        >
          <Text style={styles.addrText}>
            {(a.label || 'Home') + ` — ${a.area}, ${a.emirate}`}
          </Text>
        </Pressable>
      ))}
      {!addresses.length ? (
        <Pressable onPress={() => router.push('/addresses')}>
          <Text style={styles.linkText}>Add an address first</Text>
        </Pressable>
      ) : null}

      <Text style={styles.section}>Box contents ({selected.length}/8)</Text>
      <View style={styles.grid}>
        {products.map((p) => {
          const on = selected.includes(p.id);
          return (
            <Pressable
              key={p.id}
              style={[styles.product, on && styles.productOn]}
              onPress={() => toggle(p.id)}
            >
              <Text style={styles.productName}>{p.nameEn}</Text>
              <Text style={styles.productSku}>{p.sku}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.btn} onPress={() => void save()}>
        <Text style={styles.btnText}>{editingId ? 'Save changes' : 'Start plan'}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items.map((s) => (
        <View key={s.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {s.planCode} · {s.status}
          </Text>
          <Text style={styles.meta}>
            {new Date(s.startsAt).toLocaleDateString()}
            {s.meta?.nextRunAt ? ` · Next ${new Date(s.meta.nextRunAt).toLocaleDateString()}` : ''}
            {s.meta?.productIds?.length ? ` · ${s.meta.productIds.length} items` : ''}
            {s.meta?.lastOrderNumber ? ` · ${s.meta.lastOrderNumber}` : ''}
          </Text>
          {s.status === 'ACTIVE' || s.status === 'PAUSED' ? (
            <View style={styles.actions}>
              <Pressable onPress={() => startEdit(s)}>
                <Text style={styles.edit}>Edit</Text>
              </Pressable>
              {s.status === 'ACTIVE' ? (
                <Pressable onPress={() => void cancel(s.id)}>
                  <Text style={styles.cancel}>Cancel</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
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
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  hint: { color: '#64748b', fontSize: 13, marginBottom: 12 },
  section: { marginTop: 8, marginBottom: 8, fontWeight: '700', color: '#0f172a', fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
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
  addr: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  addrActive: { borderColor: '#0f766e', backgroundColor: '#ecfdf5' },
  addrText: { color: '#334155', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  product: {
    width: '47%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  productOn: { borderColor: '#0f766e', backgroundColor: '#ecfdf5' },
  productName: { fontWeight: '600', color: '#0f172a', fontSize: 13 },
  productSku: { marginTop: 2, color: '#94a3b8', fontSize: 11 },
  btn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  error: { color: '#b91c1c', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, color: '#64748b', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  edit: { color: '#0f766e', fontWeight: '600' },
  cancel: { color: '#b91c1c', fontWeight: '600' },
  link: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#0f766e', fontWeight: '600' },
});
