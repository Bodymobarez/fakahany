import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { apiFetch, getToken } from '../../src/lib/auth';

type TrackData = {
  orderId: string;
  status: string;
  lastPoint?: { lat: number; lng: number; createdAt: string } | null;
  statusHistory: Array<{ status: string; note?: string | null; createdAt: string }>;
  assignment?: {
    driver?: { user?: { firstName?: string; lastName?: string; phone?: string | null } } | null;
  } | null;
};

export default function TrackOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<TrackData | null>(null);
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
      const d = await apiFetch(`/api/delivery/track/${id}`);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load tracking');
    } finally {
      setRefreshing(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  const region = useMemo(() => {
    if (!data?.lastPoint) {
      return { latitude: 25.2048, longitude: 55.2708, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    }
    return {
      latitude: data.lastPoint.lat,
      longitude: data.lastPoint.lng,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
  }, [data?.lastPoint]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>Track order</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {data ? (
        <>
          <Text style={styles.status}>{data.status.replaceAll('_', ' ')}</Text>
          {data.assignment?.driver?.user ? (
            <Text style={styles.meta}>
              Driver: {data.assignment.driver.user.firstName}{' '}
              {data.assignment.driver.user.lastName}
              {data.assignment.driver.user.phone
                ? ` · ${data.assignment.driver.user.phone}`
                : ''}
            </Text>
          ) : (
            <Text style={styles.meta}>Driver not assigned yet</Text>
          )}

          <View style={styles.mapWrap}>
            <MapView style={styles.map} provider={PROVIDER_DEFAULT} region={region}>
              {data.lastPoint ? (
                <Marker
                  coordinate={{
                    latitude: data.lastPoint.lat,
                    longitude: data.lastPoint.lng,
                  }}
                  title="Driver"
                  description={new Date(data.lastPoint.createdAt).toLocaleTimeString()}
                  pinColor="#0f766e"
                />
              ) : null}
            </MapView>
          </View>
          {data.lastPoint ? (
            <Text style={styles.gps}>
              Updated {new Date(data.lastPoint.createdAt).toLocaleTimeString()} ·{' '}
              {data.lastPoint.lat.toFixed(5)}, {data.lastPoint.lng.toFixed(5)}
            </Text>
          ) : (
            <Text style={styles.meta}>Waiting for driver GPS…</Text>
          )}

          {(data.statusHistory || []).map((h, idx) => (
            <View key={`${h.status}-${idx}`} style={styles.card}>
              <Text style={styles.cardTitle}>{h.status.replaceAll('_', ' ')}</Text>
              {h.note ? <Text style={styles.meta}>{h.note}</Text> : null}
              <Text style={styles.date}>{new Date(h.createdAt).toLocaleString()}</Text>
            </View>
          ))}
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
  status: { marginTop: 12, fontSize: 20, fontWeight: '700', color: '#14532d' },
  meta: { marginTop: 8, color: '#64748b' },
  mapWrap: {
    marginTop: 14,
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#e2e8f0',
  },
  map: { flex: 1 },
  gps: { marginTop: 10, color: '#0f766e', fontWeight: '600', fontSize: 12 },
  error: { color: '#b91c1c', marginTop: 10 },
  card: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  cardTitle: { fontWeight: '700', color: '#0f172a' },
  date: { marginTop: 4, fontSize: 12, color: '#94a3b8' },
  link: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  linkText: { color: '#0f766e', fontWeight: '600' },
});
