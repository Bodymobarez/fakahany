import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SignaturePad } from '../../src/components/SignaturePad';
import { API_URL } from '../../src/lib/api';
import { apiFetch, getToken } from '../../src/lib/auth';
import { useDriverLocationBroadcast } from '../../src/lib/locationBroadcast';

async function uploadDataUrl(dataUrl: string, filename: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/upload/data-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ dataUrl, filename }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || 'Upload failed');
  return data.file.url as string;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [recipient, setRecipient] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('Collect OTP + proof of delivery');
  const [orderNumber, setOrderNumber] = useState(id);
  const [addressLabel, setAddressLabel] = useState('');
  const [lineItems, setLineItems] = useState<
    Array<{ id: string; nameEn: string; sku: string; quantity: number }>
  >([]);
  const [navCoords, setNavCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const { label: gpsLabel } = useDriverLocationBroadcast(true);

  useEffect(() => {
    void apiFetch('/api/driver/assignments')
      .then((data) => {
        const found = (data.assignments || []).find(
          (a: {
            order: {
              id: string;
              orderNumber?: string;
              items?: Array<{ id: string; nameEn: string; sku: string; quantity: number }>;
              address?: {
                line1?: string;
                city?: string;
                emirate?: string;
                lat?: number | null;
                lng?: number | null;
              };
            };
          }) => a.order.id === id,
        );
        if (found?.order?.orderNumber) setOrderNumber(found.order.orderNumber);
        setLineItems(found?.order?.items || []);
        const addr = found?.order?.address;
        if (addr) {
          setAddressLabel(
            [addr.line1, addr.city, addr.emirate].filter(Boolean).join(', '),
          );
          if (addr.lat != null && addr.lng != null) {
            setNavCoords({ lat: Number(addr.lat), lng: Number(addr.lng) });
          }
        }
      })
      .catch(() => undefined);
  }, [id]);

  function openNavigation() {
    if (navCoords) {
      const { lat, lng } = navCoords;
      const url =
        Platform.OS === 'ios'
          ? `http://maps.apple.com/?daddr=${lat},${lng}`
          : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      void Linking.openURL(url);
      return;
    }
    if (addressLabel) {
      const q = encodeURIComponent(addressLabel);
      void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
    }
  }

  async function markOutForDelivery() {
    setBusy(true);
    try {
      await apiFetch(`/api/driver/orders/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: 'OUT_FOR_DELIVERY' }),
      });
      setStatus('Marked out for delivery — GPS broadcasting');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (lib.status !== 'granted') {
        setStatus('Camera / photos permission required');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
      allowsEditing: true,
    }).catch(async () =>
      ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        base64: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      }),
    );
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.base64) {
      const mime = asset.mimeType || 'image/jpeg';
      setPhotoUri(`data:${mime};base64,${asset.base64}`);
    } else if (asset.uri) {
      setPhotoUri(asset.uri);
    }
  }

  async function markDelivered() {
    setBusy(true);
    try {
      if (!otp.trim()) throw new Error('Enter delivery OTP');
      if (!photoUri && !signatureDataUrl && !recipient.trim()) {
        throw new Error('Add photo, signature, or recipient name');
      }

      let podPhotoUrl: string | null = null;
      let podSignatureUrl: string | null = null;

      if (photoUri?.startsWith('data:')) {
        podPhotoUrl = await uploadDataUrl(photoUri, 'pod-photo.jpg');
      }
      if (signatureDataUrl) {
        podSignatureUrl = await uploadDataUrl(signatureDataUrl, 'pod-signature.svg');
      }

      await apiFetch(`/api/driver/orders/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: 'DELIVERED',
          otp,
          podPhotoUrl,
          podSignatureUrl,
          podRecipientName: recipient.trim() || null,
        }),
      });
      setStatus('Delivered with proof of delivery');
      setTimeout(() => router.replace('/(tabs)/orders'), 800);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>{orderNumber}</Text>
      {addressLabel ? <Text style={styles.address}>{addressLabel}</Text> : null}
      <Text style={styles.gps}>{gpsLabel}</Text>

      {(navCoords || addressLabel) ? (
        <Pressable
          style={[styles.btn, { backgroundColor: '#15803d', marginBottom: 10 }]}
          onPress={openNavigation}
        >
          <Text style={styles.btnText}>Navigate in maps</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={[styles.btn, { backgroundColor: '#0369a1', marginBottom: 16 }]}
        disabled={busy}
        onPress={() => void markOutForDelivery()}
      >
        <Text style={styles.btnText}>Start delivery (out for delivery)</Text>
      </Pressable>

      {lineItems.length ? (
        <View style={styles.checklist}>
          <Text style={styles.section}>Delivery checklist</Text>
          {lineItems.map((item) => (
            <View key={item.id} style={styles.checkRow}>
              <Text style={styles.checkQty}>{item.quantity}×</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.checkName}>{item.nameEn}</Text>
                <Text style={styles.checkSku}>{item.sku}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.section}>Customer delivery OTP</Text>
      <TextInput
        style={styles.input}
        placeholder="OTP"
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
      />

      <Text style={styles.section}>Recipient name</Text>
      <TextInput
        style={styles.input}
        placeholder="Received by"
        value={recipient}
        onChangeText={setRecipient}
      />

      <Text style={styles.section}>Proof photo</Text>
      <Pressable style={styles.secondary} onPress={() => void pickPhoto()}>
        <Text style={styles.secondaryText}>{photoUri ? 'Retake photo' : 'Take / choose photo'}</Text>
      </Pressable>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}

      <Text style={styles.section}>Signature</Text>
      <SignaturePad onChange={setSignatureDataUrl} />

      <Pressable
        style={[styles.btn, { backgroundColor: '#0f766e', marginTop: 16 }]}
        disabled={busy}
        onPress={() => void markDelivered()}
      >
        <Text style={styles.btnText}>{busy ? '…' : 'Confirm delivered'}</Text>
      </Pressable>
      <Text style={styles.status}>{status}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  address: { color: '#334155', marginBottom: 8, lineHeight: 20 },
  gps: { color: '#64748b', marginBottom: 16, fontSize: 13 },
  section: { fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  btn: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  secondary: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  secondaryText: { color: '#0f172a', fontWeight: '600' },
  preview: { width: '100%', height: 180, borderRadius: 12, marginBottom: 8 },
  status: { marginTop: 20, color: '#0f766e', fontWeight: '600' },
  checklist: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  checkRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  checkQty: { fontWeight: '800', color: '#0f766e', minWidth: 28 },
  checkName: { fontWeight: '600', color: '#0f172a' },
  checkSku: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
});
