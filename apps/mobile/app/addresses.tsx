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

type Address = {
  id: string;
  label: string;
  line1: string;
  city: string;
  emirate: string;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  isDefault?: boolean;
};

const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'RAK', 'Fujairah', 'UAQ'];

const PRESETS: Record<string, { lat: number; lng: number }> = {
  Dubai: { lat: 25.2048, lng: 55.2708 },
  'Abu Dhabi': { lat: 24.4539, lng: 54.3773 },
  Sharjah: { lat: 25.3463, lng: 55.4209 },
  Ajman: { lat: 25.4052, lng: 55.5136 },
  RAK: { lat: 25.7895, lng: 55.9432 },
  Fujairah: { lat: 25.1288, lng: 56.3265 },
  UAQ: { lat: 25.5647, lng: 55.5552 },
};

export default function AddressesScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('Home');
  const [line1, setLine1] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Dubai');
  const [emirate, setEmirate] = useState('Dubai');
  const [lat, setLat] = useState(String(PRESETS.Dubai.lat));
  const [lng, setLng] = useState(String(PRESETS.Dubai.lng));

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const data = await apiFetch('/api/addresses');
      setAddresses(data.addresses || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load addresses');
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  function pickEmirate(e: string) {
    setEmirate(e);
    setCity(e);
    const p = PRESETS[e] || PRESETS.Dubai;
    setLat(String(p.lat));
    setLng(String(p.lng));
  }

  async function useDeviceLocation() {
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied — enter coordinates manually');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(String(Number(pos.coords.latitude.toFixed(6))));
      setLng(String(Number(pos.coords.longitude.toFixed(6))));
      setOk('Coordinates updated from device');
    } catch {
      setError('Location unavailable — enter lat/lng manually');
    }
  }

  async function save() {
    if (!line1.trim()) {
      setError('Enter street / building');
      return;
    }
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      setError('Enter valid latitude and longitude');
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await apiFetch('/api/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: label.trim() || 'Home',
          line1: line1.trim(),
          area: area.trim() || null,
          street: line1.trim(),
          city: city.trim() || emirate,
          emirate,
          lat: latN,
          lng: lngN,
          isDefault: addresses.length === 0,
        }),
      });
      setShowForm(false);
      setLine1('');
      setArea('');
      setOk('Address saved');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(id: string) {
    try {
      await apiFetch(`/api/addresses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isDefault: true }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>Addresses</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {ok ? <Text style={styles.ok}>{ok}</Text> : null}

      <Pressable style={styles.btn} onPress={() => setShowForm((v) => !v)}>
        <Text style={styles.btnText}>{showForm ? 'Cancel' : 'Add address'}</Text>
      </Pressable>

      {showForm ? (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Label" value={label} onChangeText={setLabel} />
          <TextInput
            style={styles.input}
            placeholder="Street / building"
            value={line1}
            onChangeText={setLine1}
          />
          <TextInput style={styles.input} placeholder="Area" value={area} onChangeText={setArea} />
          <Text style={styles.section}>Emirate</Text>
          <View style={styles.row}>
            {EMIRATES.map((e) => (
              <Pressable
                key={e}
                style={[styles.chip, emirate === e && styles.chipActive]}
                onPress={() => pickEmirate(e)}
              >
                <Text style={[styles.chipText, emirate === e && styles.chipTextActive]}>{e}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.secondary} onPress={() => void useDeviceLocation()}>
            <Text style={styles.secondaryText}>Use my location</Text>
          </Pressable>
          <View style={styles.coords}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Latitude"
              keyboardType="decimal-pad"
              value={lat}
              onChangeText={setLat}
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Longitude"
              keyboardType="decimal-pad"
              value={lng}
              onChangeText={setLng}
            />
          </View>
          <Pressable style={styles.btn} disabled={busy} onPress={() => void save()}>
            <Text style={styles.btnText}>{busy ? 'Saving…' : 'Save address'}</Text>
          </Pressable>
        </View>
      ) : null}

      {addresses.length === 0 && !error ? (
        <Text style={styles.empty}>No saved addresses yet.</Text>
      ) : null}
      {addresses.map((a) => (
        <View key={a.id} style={styles.card}>
          <Text style={styles.label}>
            {a.label}
            {a.isDefault ? ' · Default' : ''}
          </Text>
          <Text style={styles.line}>
            {a.line1}
            {a.area ? `, ${a.area}` : ''}, {a.city}, {a.emirate}
          </Text>
          <Text style={styles.meta}>
            {a.lat != null && a.lng != null
              ? `${Number(a.lat).toFixed(4)}, ${Number(a.lng).toFixed(4)}`
              : 'No coordinates — zone fees may be inaccurate'}
          </Text>
          {!a.isDefault ? (
            <Pressable onPress={() => void makeDefault(a.id)}>
              <Text style={styles.linkText}>Make default</Text>
            </Pressable>
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
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  error: { color: '#b91c1c', marginBottom: 10 },
  ok: { color: '#0f766e', marginBottom: 10 },
  empty: { color: '#64748b' },
  form: { marginBottom: 16 },
  section: { fontWeight: '700', color: '#0f172a', marginBottom: 8, fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#0f766e', backgroundColor: '#ecfdf5' },
  chipText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#0f766e' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  coords: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  btn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  secondary: {
    borderWidth: 1,
    borderColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryText: { color: '#0f766e', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
  },
  label: { fontWeight: '700', color: '#0f172a' },
  line: { marginTop: 4, color: '#64748b' },
  meta: { marginTop: 4, color: '#94a3b8', fontSize: 12 },
  link: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  linkText: { color: '#0f766e', fontWeight: '600', marginTop: 8 },
});
