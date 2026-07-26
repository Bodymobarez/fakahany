import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { apiFetch, clearToken, getToken } from '../src/lib/auth';

export default function PrivacyScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function exportData() {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    try {
      const data = await apiFetch('/api/compliance/export');
      setStatus(`Export ready (${data.regulation}) — ${data.data?.orders?.length || 0} orders included`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Export failed');
    }
  }

  async function deleteAccount() {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    try {
      await apiFetch('/api/compliance/delete', { method: 'POST', body: '{}' });
      clearToken();
      setStatus('Account anonymized');
      setTimeout(() => router.replace('/login'), 700);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Privacy (PDPL)</Text>
      <Text style={styles.body}>
        Download your personal data or request erasure under UAE PDPL.
      </Text>
      <Pressable style={styles.btn} onPress={() => void exportData()}>
        <Text style={styles.btnText}>Export my data</Text>
      </Pressable>
      <Pressable style={styles.danger} onPress={() => void deleteAccount()}>
        <Text style={styles.dangerText}>Delete / anonymize account</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
      <Pressable style={styles.link} onPress={() => router.back()}>
        <Text style={styles.linkText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  body: { marginTop: 10, color: '#64748b', marginBottom: 16 },
  btn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  danger: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dangerText: { color: '#b91c1c', fontWeight: '700' },
  status: { marginTop: 14, color: '#0f766e' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#0f766e', fontWeight: '600' },
});
