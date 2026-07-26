import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { forgotPassword, resetPassword } from '../src/lib/authApi';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [note, setNote] = useState('Enter your account email to reset password.');
  const [busy, setBusy] = useState(false);

  async function requestReset() {
    setBusy(true);
    try {
      const data = await forgotPassword(email.trim());
      setNote(data.message || 'Check your email for a reset token.');
      if (data.devToken) {
        setToken(data.devToken);
        setStep('reset');
        setNote('Dev token ready. Set a new password.');
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setBusy(true);
    try {
      await resetPassword({
        email: email.trim(),
        token: token.trim(),
        password,
      });
      setNote('Password updated. You can sign in now.');
      router.replace('/login');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset password</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      {step === 'reset' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Reset token"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="New password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable style={styles.btn} disabled={busy} onPress={() => void onReset()}>
            <Text style={styles.btnText}>{busy ? '…' : 'Update password'}</Text>
          </Pressable>
        </>
      ) : (
        <Pressable style={styles.btn} disabled={busy} onPress={() => void requestReset()}>
          <Text style={styles.btnText}>{busy ? '…' : 'Send reset link'}</Text>
        </Pressable>
      )}
      <Pressable style={styles.link} onPress={() => router.back()}>
        <Text style={styles.linkText}>Back to login</Text>
      </Pressable>
      <Text style={styles.note}>{note}</Text>
    </View>
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
