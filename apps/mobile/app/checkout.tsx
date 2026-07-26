import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiFetch, getToken } from '../src/lib/auth';

type Address = {
  id: string;
  label: string;
  line1: string;
  city: string;
  emirate: string;
  isDefault: boolean;
};

type PayMethod = { id: string; label: string; stub?: boolean };

export default function CheckoutScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState('');
  const [methods, setMethods] = useState<PayMethod[]>([{ id: 'COD', label: 'Cash on Delivery' }]);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [cartId, setCartId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quoteLabel, setQuoteLabel] = useState('Checking delivery…');
  const [covered, setCovered] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [walletInput, setWalletInput] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [loyaltyInput, setLoyaltyInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newLine1, setNewLine1] = useState('');
  const [newCity, setNewCity] = useState('Dubai');
  const [newEmirate, setNewEmirate] = useState('Dubai');
  const [newLat, setNewLat] = useState('25.2048');
  const [newLng, setNewLng] = useState('55.2708');

  async function refreshCart(addrId?: string) {
    const q = addrId ? `?addressId=${encodeURIComponent(addrId)}` : '';
    const cartRes = await apiFetch(`/api/cart${q}`);
    setCartId(cartRes.cart?.id || null);
    setTotal(Number(cartRes.cart?.total || 0));
    setSubtotal(Number(cartRes.cart?.subtotal || 0));
    const qte = cartRes.cart?.deliveryQuote;
    if (qte) {
      setCovered(Boolean(qte.covered));
      setQuoteLabel(
        qte.covered
          ? `Delivery ${Number(qte.fee).toFixed(2)} AED · ${qte.zone?.name || 'zone'}`
          : qte.reason || 'Outside delivery zone',
      );
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void Promise.all([
      apiFetch('/api/cart'),
      apiFetch('/api/addresses'),
      apiFetch('/api/payments/methods'),
      apiFetch('/api/wallet/me').catch(() => ({ wallet: { balance: 0 } })),
      apiFetch('/api/loyalty/me').catch(() => ({ account: { points: 0 } })),
    ])
      .then(async ([cartRes, addrRes, payRes, walletRes, loyaltyRes]) => {
        setCartId(cartRes.cart?.id || null);
        setTotal(Number(cartRes.cart?.total || 0));
        setSubtotal(Number(cartRes.cart?.subtotal || 0));
        const addrs: Address[] = addrRes.addresses || [];
        setAddresses(addrs);
        const def = addrs.find((a) => a.isDefault) || addrs[0];
        if (def) {
          setAddressId(def.id);
          await refreshCart(def.id);
        } else {
          setShowNew(true);
        }
        const usable = (payRes.methods || []).filter((m: PayMethod) => m.id !== 'WALLET');
        if (usable.length) {
          setMethods(usable);
          setPaymentMethod(usable[0].id);
        }
        const bal = Number(walletRes.wallet?.balance || 0);
        setWalletBalance(bal);
        setWalletInput(bal > 0 ? String(bal) : '');
        const pts = Number(loyaltyRes.account?.points || 0);
        setLoyaltyPoints(pts);
        setLoyaltyInput(pts > 0 ? String(pts) : '');
      })
      .catch((e) => setStatus(e instanceof Error ? e.message : 'Load failed'));
  }, [router]);

  useEffect(() => {
    if (!addressId || showNew) return;
    void refreshCart(addressId).catch(() => undefined);
  }, [addressId, showNew]);

  async function ensureAddress(): Promise<string> {
    if (!showNew && addressId) return addressId;
    if (!newLine1.trim()) throw new Error('Enter a street address');
    const lat = Number(newLat);
    const lng = Number(newLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Enter valid latitude and longitude');
    }
    const data = await apiFetch('/api/addresses', {
      method: 'POST',
      body: JSON.stringify({
        label: newLabel || 'Home',
        line1: newLine1.trim(),
        street: newLine1.trim(),
        city: newCity || 'Dubai',
        emirate: newEmirate || 'Dubai',
        lat,
        lng,
        isDefault: true,
      }),
    });
    setAddressId(data.address.id);
    setShowNew(false);
    setAddresses((prev) => [data.address, ...prev]);
    return data.address.id as string;
  }

  async function useDeviceLocation() {
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setStatus('Location permission denied — enter coordinates manually');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setNewLat(String(Number(pos.coords.latitude.toFixed(6))));
      setNewLng(String(Number(pos.coords.longitude.toFixed(6))));
      setStatus('Coordinates updated from device');
    } catch {
      setStatus('Location unavailable — enter lat/lng manually');
    }
  }

  async function applyCoupon() {
    if (!coupon.trim()) return;
    setBusy(true);
    try {
      await apiFetch('/api/cart/coupon', {
        method: 'POST',
        body: JSON.stringify({ code: coupon.trim() }),
      });
      await refreshCart(addressId || undefined);
      setStatus(`Coupon ${coupon.trim().toUpperCase()} applied`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Coupon failed');
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder() {
    setBusy(true);
    setStatus(null);
    try {
      const selectedAddress = await ensureAddress();
      if (!cartId) throw new Error('Cart missing');
      if (!covered) throw new Error(quoteLabel);

      const quote = await apiFetch('/api/delivery/quote', {
        method: 'POST',
        body: JSON.stringify({
          addressId: selectedAddress,
          subtotal,
        }),
      });
      if (!quote.quote?.covered) {
        throw new Error(quote.quote?.reason || 'Outside delivery zone');
      }

      const walletAmount =
        useWallet && walletBalance > 0
          ? Math.min(walletBalance, Number(walletInput || 0), total)
          : null;
      const pointsToRedeem =
        useLoyalty && loyaltyPoints >= 100
          ? Math.min(loyaltyPoints, Math.floor(Number(loyaltyInput || 0)))
          : null;

      const data = await apiFetch('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          cartId,
          addressId: selectedAddress,
          paymentMethod,
          deliveryType: 'SAME_DAY',
          deliveryNotes: notes || null,
          walletAmount,
          pointsToRedeem,
        }),
      });

      let payNote = '';
      if (paymentMethod === 'STRIPE' && data.payment?.id) {
        const secret = data.intent?.clientSecret || '';
        const isStub =
          secret.startsWith('stub_') ||
          Boolean(data.intent?.meta?.stub) ||
          !secret;
        if (isStub) {
          await apiFetch('/api/payments/confirm', {
            method: 'POST',
            body: JSON.stringify({
              paymentId: data.payment.id,
              externalId: `stub_confirmed_${data.order.id}`,
            }),
          });
          payNote = ' · card confirmed (demo stub)';
        } else {
          payNote =
            ' · card intent created — finish on web checkout (same account) or wait for Stripe webhook';
        }
      } else if (data.payment?.id && (paymentMethod === 'TABBY' || paymentMethod === 'TAMARA')) {
        router.replace({
          pathname: '/bnpl',
          params: {
            paymentId: data.payment.id,
            orderId: data.order.id,
            orderNumber: data.order.orderNumber,
            method: paymentMethod,
          },
        });
        return;
      } else if (
        data.payment?.id &&
        (paymentMethod === 'APPLE_PAY' ||
          paymentMethod === 'GOOGLE_PAY' ||
          data.intent?.meta?.stub)
      ) {
        await apiFetch('/api/payments/confirm', {
          method: 'POST',
          body: JSON.stringify({
            paymentId: data.payment.id,
            externalId: `${paymentMethod.toLowerCase()}_confirmed_${data.order.id}`,
          }),
        });
        payNote = ` · ${paymentMethod} confirmed (demo stub)`;
      }

      setStatus(`Order ${data.order.orderNumber} placed${payNote}`);
      setTimeout(() => router.replace('/orders'), 700);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Checkout</Text>
      <Text style={styles.total}>Total: {total.toFixed(2)} AED</Text>
      <Text style={[styles.quote, !covered && styles.quoteBad]}>{quoteLabel}</Text>

      <Text style={styles.section}>Coupon</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="FRESH10"
          autoCapitalize="characters"
          value={coupon}
          onChangeText={setCoupon}
        />
        <Pressable style={styles.smallBtn} onPress={() => void applyCoupon()}>
          <Text style={styles.btnText}>Apply</Text>
        </Pressable>
      </View>

      {walletBalance > 0 ? (
        <>
          <Text style={styles.section}>Wallet ({walletBalance.toFixed(2)} AED)</Text>
          <Pressable style={styles.card} onPress={() => setUseWallet((v) => !v)}>
            <Text style={styles.cardTitle}>{useWallet ? '✓ Using wallet' : 'Apply wallet'}</Text>
          </Pressable>
          {useWallet ? (
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={walletInput}
              onChangeText={setWalletInput}
            />
          ) : null}
        </>
      ) : null}

      {loyaltyPoints >= 100 ? (
        <>
          <Text style={styles.section}>Loyalty ({loyaltyPoints} pts · 100=1 AED)</Text>
          <Pressable style={styles.card} onPress={() => setUseLoyalty((v) => !v)}>
            <Text style={styles.cardTitle}>
              {useLoyalty ? '✓ Redeeming points' : 'Redeem loyalty points'}
            </Text>
          </Pressable>
          {useLoyalty ? (
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={loyaltyInput}
              onChangeText={setLoyaltyInput}
            />
          ) : null}
        </>
      ) : null}

      <Text style={styles.section}>Delivery address</Text>
      {!showNew &&
        addresses.map((a) => (
          <Pressable
            key={a.id}
            style={[styles.card, addressId === a.id && styles.cardActive]}
            onPress={() => setAddressId(a.id)}
          >
            <Text style={styles.cardTitle}>{a.label}</Text>
            <Text style={styles.cardBody}>
              {a.line1}, {a.city}, {a.emirate}
            </Text>
          </Pressable>
        ))}
      <Pressable onPress={() => setShowNew((v) => !v)}>
        <Text style={styles.link}>{showNew ? 'Use saved address' : 'Add new address'}</Text>
      </Pressable>
      {showNew ? (
        <View style={{ marginTop: 8 }}>
          <TextInput
            style={styles.input}
            placeholder="Label"
            value={newLabel}
            onChangeText={setNewLabel}
          />
          <TextInput
            style={styles.input}
            placeholder="Street / building"
            value={newLine1}
            onChangeText={setNewLine1}
          />
          <TextInput
            style={styles.input}
            placeholder="City"
            value={newCity}
            onChangeText={setNewCity}
          />
          <TextInput
            style={styles.input}
            placeholder="Emirate"
            value={newEmirate}
            onChangeText={setNewEmirate}
          />
          <Pressable onPress={() => void useDeviceLocation()}>
            <Text style={styles.link}>Use my location</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Latitude"
            keyboardType="decimal-pad"
            value={newLat}
            onChangeText={setNewLat}
          />
          <TextInput
            style={styles.input}
            placeholder="Longitude"
            keyboardType="decimal-pad"
            value={newLng}
            onChangeText={setNewLng}
          />
        </View>
      ) : null}

      <Text style={styles.section}>Payment</Text>
      {methods.map((m) => (
        <Pressable
          key={m.id}
          style={[styles.card, paymentMethod === m.id && styles.cardActive]}
          onPress={() => setPaymentMethod(m.id)}
        >
          <Text style={styles.cardTitle}>{m.label}</Text>
        </Pressable>
      ))}

      <Text style={styles.section}>Notes</Text>
      <TextInput
        style={styles.input}
        placeholder="Gate code, leave with security…"
        value={notes}
        onChangeText={setNotes}
      />

      <Pressable
        style={[styles.btn, (busy || !covered) && { opacity: 0.6 }]}
        disabled={busy || !covered}
        onPress={() => void placeOrder()}
      >
        <Text style={styles.btnText}>{busy ? 'Placing…' : 'Place order'}</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  total: { marginTop: 6, fontWeight: '600', color: '#0f766e' },
  quote: { marginTop: 4, marginBottom: 12, color: '#334155', fontSize: 13 },
  quoteBad: { color: '#b91c1c' },
  section: { marginTop: 12, marginBottom: 8, fontWeight: '600', color: '#334155' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardActive: { borderColor: '#0f766e', backgroundColor: '#f0fdfa' },
  cardTitle: { fontWeight: '600', color: '#0f172a' },
  cardBody: { marginTop: 4, color: '#64748b', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  smallBtn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  link: { color: '#0f766e', fontWeight: '600', marginBottom: 8 },
  status: { marginTop: 14, color: '#0f766e', fontWeight: '600' },
});
