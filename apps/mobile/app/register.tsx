import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { registerCustomer } from '../src/lib/authApi';

export default function RegisterScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+971');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [note, setNote] = useState('Create a Fresh Harvest account.');
  const [busy, setBusy] = useState(false);

  async function onRegister() {
    if (password !== confirm) {
      setNote('Passwords do not match');
      return;
    }
    setBusy(true);
    setNote('Creating account…');
    try {
      const data = await registerCustomer({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
      });
      if (data.accessToken) await signIn(data.accessToken);
      setNote('Account created.');
      router.replace('/(tabs)');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Register failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Create account</Text>
      <TextInput
        style={styles.input}
        placeholder="First name"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={styles.input}
        placeholder="Last name"
        value={lastName}
        onChangeText={setLastName}
      />
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
      />
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password (8+, 1 upper, 1 special)"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
          <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Confirm password"
          secureTextEntry={!showConfirm}
          value={confirm}
          onChangeText={setConfirm}
        />
        <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm((v) => !v)}>
          <Text style={styles.eyeText}>{showConfirm ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
      <Pressable style={styles.btn} disabled={busy} onPress={() => void onRegister()}>
        <Text style={styles.btnText}>{busy ? 'Please wait…' : 'Register'}</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => router.push('/login')}>
        <Text style={styles.linkText}>Already have an account? Sign in</Text>
      </Pressable>
      <Text style={styles.note}>{note}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    paddingRight: 8,
  },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  eyeBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  eyeText: { color: '#0f766e', fontWeight: '700', fontSize: 13 },
  btn: {
    backgroundColor: '#0f766e',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#0f766e', fontWeight: '600' },
  note: { marginTop: 12, color: '#64748b', lineHeight: 20 },
});
