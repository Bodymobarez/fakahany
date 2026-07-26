import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { apiFetch, getToken } from '../../src/lib/auth';
import { useDriverLocationBroadcast } from '../../src/lib/locationBroadcast';

type Assignment = {
  id: string;
  stopOrder?: number;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    address?: {
      line1?: string;
      city?: string;
      emirate?: string;
      lat?: number | null;
      lng?: number | null;
    };
  };
};

export default function RouteMapScreen() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { coords: myCoords, label: gpsLabel } = useDriverLocationBroadcast(true);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const data = await apiFetch('/api/driver/assignments');
      setAssignments(data.assignments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load route');
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const stops = useMemo(
    () =>
      assignments
        .map((a, idx) => ({
          id: a.id,
          orderId: a.order.id,
          orderNumber: a.order.orderNumber,
          stopOrder: a.stopOrder || idx + 1,
          status: a.order.status,
          label: [a.order.address?.line1, a.order.address?.city].filter(Boolean).join(', '),
          lat: a.order.address?.lat != null ? Number(a.order.address.lat) : null,
          lng: a.order.address?.lng != null ? Number(a.order.address.lng) : null,
        }))
        .sort((a, b) => a.stopOrder - b.stopOrder),
    [assignments],
  );

  const geoStops = stops.filter((s) => s.lat != null && s.lng != null) as Array<{
    id: string;
    orderId: string;
    orderNumber: string;
    stopOrder: number;
    status: string;
    label: string;
    lat: number;
    lng: number;
  }>;

  const region = useMemo(() => {
    const lats = [
      ...geoStops.map((s) => s.lat),
      ...(myCoords ? [myCoords.lat] : []),
    ];
    const lngs = [
      ...geoStops.map((s) => s.lng),
      ...(myCoords ? [myCoords.lng] : []),
    ];
    if (!lats.length) {
      return { latitude: 25.2048, longitude: 55.2708, latitudeDelta: 0.2, longitudeDelta: 0.2 };
    }
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.04, (maxLat - minLat) * 1.6 || 0.04),
      longitudeDelta: Math.max(0.04, (maxLng - minLng) * 1.6 || 0.04),
    };
  }, [geoStops, myCoords]);

  function openExternalRoute() {
    if (!geoStops.length) return;
    if (Platform.OS === 'ios') {
      const dest = geoStops[geoStops.length - 1]!;
      const waypoints = geoStops
        .slice(0, -1)
        .map((s) => `${s.lat},${s.lng}`)
        .join('+to:');
      const url = waypoints
        ? `http://maps.apple.com/?saddr=Current+Location&daddr=${waypoints}+to:${dest.lat},${dest.lng}&dirflg=d`
        : `http://maps.apple.com/?daddr=${dest.lat},${dest.lng}&dirflg=d`;
      void Linking.openURL(url);
      return;
    }
    const dest = geoStops[geoStops.length - 1]!;
    const waypoints = geoStops
      .slice(0, -1)
      .map((s) => `${s.lat},${s.lng}`)
      .join('|');
    const url = waypoints
      ? `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
    void Linking.openURL(url);
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.title}>Today&apos;s route</Text>
      <Text style={styles.meta}>
        {stops.length} stop{stops.length === 1 ? '' : 's'} · {geoStops.length} with GPS
      </Text>
      <Text style={styles.gps}>{gpsLabel}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          region={region}
          showsUserLocation
          showsMyLocationButton
        >
          {geoStops.length > 1 ? (
            <Polyline
              coordinates={geoStops.map((s) => ({ latitude: s.lat, longitude: s.lng }))}
              strokeColor="#0f766e"
              strokeWidth={4}
            />
          ) : null}
          {geoStops.map((s) => (
            <Marker
              key={s.id}
              coordinate={{ latitude: s.lat, longitude: s.lng }}
              title={`#${s.stopOrder} ${s.orderNumber}`}
              description={s.label || s.status}
              onCalloutPress={() => router.push(`/order/${s.orderId}`)}
            />
          ))}
          {myCoords ? (
            <Marker
              coordinate={{ latitude: myCoords.lat, longitude: myCoords.lng }}
              title="You"
              pinColor="#0369a1"
            />
          ) : null}
        </MapView>
      </View>

      <Pressable
        style={[styles.navBtn, !geoStops.length && styles.navBtnDisabled]}
        disabled={!geoStops.length}
        onPress={openExternalRoute}
      >
        <Text style={styles.navBtnText}>
          {geoStops.length ? 'Navigate multi-stop' : 'No GPS stops yet'}
        </Text>
      </Pressable>

      {stops.map((s) => (
        <Pressable key={s.id} style={styles.card} onPress={() => router.push(`/order/${s.orderId}`)}>
          <View style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{s.stopOrder}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{s.orderNumber}</Text>
              <Text style={styles.cardSub}>{s.label || 'Address pending'}</Text>
              <Text style={styles.cardMeta}>
                {s.status}
                {s.lat == null ? ' · no geo' : ''}
              </Text>
            </View>
          </View>
        </Pressable>
      ))}
      {!stops.length ? <Text style={styles.meta}>No assigned stops.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 4, marginBottom: 4, color: '#64748b', fontSize: 13 },
  gps: { marginBottom: 12, color: '#0f766e', fontSize: 12, fontWeight: '600' },
  error: { color: '#b91c1c', marginBottom: 8 },
  mapWrap: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#e2e8f0',
  },
  map: { flex: 1 },
  navBtn: {
    marginTop: 12,
    marginBottom: 16,
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navBtnDisabled: { backgroundColor: '#94a3b8' },
  navBtnText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  cardTitle: { fontWeight: '700', color: '#0f172a' },
  cardSub: { marginTop: 2, color: '#64748b', fontSize: 13 },
  cardMeta: { marginTop: 2, color: '#94a3b8', fontSize: 12 },
});
