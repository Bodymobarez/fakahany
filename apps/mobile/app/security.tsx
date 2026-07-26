import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiFetch, getToken } from '../src/lib/auth';

export default function SecurityScreen() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setTokenCode] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    try {
      const data = await apiFetch('/api/auth/me');
      setEnabled(Boolean(data.user?.twoFactorEnabled));
    } catch {
      setNote('Could not load security status');
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setup() {
    try {
      const data = await apiFetch('/api/auth/2fa/setup', { method: 'POST', body: '{}' });
      setSecret(data.secret);
      setNote('Add this secret in your authenticator app, then verify a code.');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Setup failed');
    }
  }

  async function verify() {
    try {
      await apiFetch('/api/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ token: token.trim() }),
      });
      setEnabled(true);
      setSecret(null);
      setTokenCode('');
      setNote('Two-factor authentication enabled.');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Invalid code');
    }
  }

  async function disable() {
    try {
      await apiFetch('/api/auth/2fa/disable', { method: 'POST', body: '{}' });
      setEnabled(false);
      setNote('Two-factor authentication disabled.');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Disable failed');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Security</Text>
      <Text style={styles.meta}>2FA: {enabled ? 'Enabled' : 'Off'}</Text>
      {!enabled ? (
        <Pressable style={styles.btn} onPress={() => void setup()}>
          <Text style={styles.btnText}>Set up authenticator</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.btnSecondary} onPress={() => void disable()}>
          <Text style={styles.btnSecondaryText}>Disable 2FA</Text>
        </Pressable>
      )}
      {secret ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Secret</Text>
          <Text style={styles.secret} selectable>
            {secret}
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="6-digit code"
            value={token}
            onChangeText={(v) => setTokenCode(v.replace(/\D/g, '').slice(0, 6))}
          />
          <Pressable style={styles.btn} onPress={() => void verify()}>
            <Text style={styles.btnText}>Verify & enable</Text>
          </Pressable>
        </View>
      ) : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 8, marginBottom: 16, color: '#64748b' },
  btn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  btnSecondary: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnSecondaryText: { color: '#0f172a', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginTop: 8,
  },
  cardTitle: { fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  secret: { fontFamily: 'monospace', color: '#0f766e', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  note: { marginTop: 12, color: '#0f766e' },
});
