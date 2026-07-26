import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_URL } from '../src/lib/api';
import { apiFetch, setToken } from '../src/lib/auth';

export default function DriverLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('driver@freshharvest.ae');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.user?.role !== 'DRIVER' && data.user?.role !== 'ADMIN') {
        throw new Error('This account is not a driver');
      }
      setToken(data.accessToken);
      router.replace('/(tabs)/orders');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Driver</Text>
      <Text style={styles.sub}>Sign in to receive assignments</Text>
      <Text style={styles.meta}>API: {API_URL}</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.btn} onPress={() => void onLogin()} disabled={loading}>
        <Text style={styles.btnText}>{loading ? '…' : 'Sign in'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#f1f5f9' },
  brand: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
  sub: { marginTop: 6, color: '#475569' },
  meta: { marginTop: 10, marginBottom: 20, color: '#94a3b8', fontSize: 12 },
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
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  error: { color: '#b91c1c', marginBottom: 8 },
});
