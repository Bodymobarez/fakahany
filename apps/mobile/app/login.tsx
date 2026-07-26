import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import {
  loginWithOAuth,
  loginWithPassword,
  requestOtp,
  verifyOtp,
  type OAuthProvider,
} from '../src/lib/authApi';

type Mode = 'mobile' | 'password';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [mode, setMode] = useState<Mode>('mobile');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needs2fa, setNeeds2fa] = useState(false);
  const [totp, setTotp] = useState('');
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null);
  const [phone, setPhone] = useState('+971');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [note, setNote] = useState('Sign in with mobile number or a social account.');
  const [busy, setBusy] = useState(false);

  async function onLogin() {
    setBusy(true);
    setNote(needs2fa ? 'Verifying authenticator…' : 'Signing in…');
    try {
      if (oauthProvider && needs2fa) {
        const data = await loginWithOAuth(oauthProvider, totp);
        if (data.requires2fa) {
          setNote('Enter your 6-digit authenticator code.');
          return;
        }
        await signIn(data.accessToken);
        router.replace('/(tabs)');
        return;
      }

      const data = await loginWithPassword({
        email: email.trim(),
        password,
        totp: needs2fa ? totp : undefined,
      });
      if (data.requires2fa) {
        setNeeds2fa(true);
        setNote('Enter your 6-digit authenticator code.');
        return;
      }
      if (!data.accessToken) throw new Error('Login incomplete');
      await signIn(data.accessToken);
      setNote('Signed in.');
      router.replace('/(tabs)');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    setBusy(true);
    setNote('Sending OTP…');
    try {
      const data = await requestOtp(phone.trim());
      setOtpSent(true);
      setNote(data.devCode ? `Dev code: ${data.devCode}` : 'OTP sent. Enter the 6-digit code.');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'OTP request failed');
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp() {
    setBusy(true);
    setNote('Verifying…');
    try {
      const data = await verifyOtp(phone.trim(), otp.trim());
      if (!data.accessToken) throw new Error('OTP verified but no session');
      await signIn(data.accessToken);
      setNote('Signed in.');
      router.replace('/(tabs)');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'OTP verify failed');
    } finally {
      setBusy(false);
    }
  }

  async function socialLogin(provider: OAuthProvider) {
    setBusy(true);
    setOauthProvider(provider);
    setNote(`Signing in with ${provider}…`);
    try {
      const data = await loginWithOAuth(provider);
      if (data.requires2fa) {
        setNeeds2fa(true);
        setMode('password');
        setNote('Enter your 6-digit authenticator code.');
        return;
      }
      if (!data.accessToken) throw new Error('Login incomplete');
      await signIn(data.accessToken);
      setNote('Signed in.');
      router.replace('/(tabs)');
    } catch (e) {
      setNote(e instanceof Error ? e.message : `${provider} login failed`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer login</Text>
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, mode === 'mobile' && styles.tabActive]}
          onPress={() => setMode('mobile')}
        >
          <Text style={[styles.tabText, mode === 'mobile' && styles.tabTextActive]}>Mobile</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === 'password' && styles.tabActive]}
          onPress={() => setMode('password')}
        >
          <Text style={[styles.tabText, mode === 'password' && styles.tabTextActive]}>Email</Text>
        </Pressable>
      </View>

      {mode === 'mobile' ? (
        <>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="Mobile number (+9715…)"
            value={phone}
            onChangeText={setPhone}
          />
          {otpSent ? (
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6-digit OTP"
              value={otp}
              onChangeText={setOtp}
            />
          ) : null}
          {!otpSent ? (
            <Pressable style={styles.btn} disabled={busy} onPress={() => void sendOtp()}>
              <Text style={styles.btnText}>{busy ? '…' : 'Send OTP'}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.btn} disabled={busy} onPress={() => void onVerifyOtp()}>
              <Text style={styles.btnText}>{busy ? '…' : 'Verify & sign in'}</Text>
            </Pressable>
          )}
        </>
      ) : (
        <>
          {!oauthProvider ? (
            <>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
              />
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </>
          ) : null}
          {needs2fa ? (
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Authenticator code"
              value={totp}
              onChangeText={(v) => setTotp(v.replace(/\D/g, '').slice(0, 6))}
            />
          ) : null}
          <Pressable style={styles.btn} disabled={busy} onPress={() => void onLogin()}>
            <Text style={styles.btnText}>
              {busy ? 'Please wait…' : needs2fa ? 'Verify & sign in' : 'Continue'}
            </Text>
          </Pressable>
        </>
      )}

      <Text style={styles.divider}>Or continue with</Text>
      <View style={styles.socialRow}>
        {(['google', 'apple', 'facebook'] as OAuthProvider[]).map((provider) => (
          <Pressable
            key={provider}
            style={styles.socialBtn}
            disabled={busy}
            onPress={() => void socialLogin(provider)}
          >
            <Text style={styles.socialText}>
              {provider[0]!.toUpperCase() + provider.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.link} onPress={() => router.push('/register')}>
        <Text style={styles.linkText}>Create account</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => router.push('/forgot')}>
        <Text style={styles.linkText}>Forgot password?</Text>
      </Pressable>
      <Text style={styles.note}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#0f766e' },
  tabText: { fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#fff' },
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
  divider: {
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  socialRow: { flexDirection: 'row', gap: 8 },
  socialBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  socialText: { fontWeight: '600', color: '#0f172a', fontSize: 12 },
  link: { marginTop: 14, alignItems: 'center' },
  linkText: { color: '#0f766e', fontWeight: '600' },
  note: { marginTop: 16, color: '#64748b', lineHeight: 20 },
});
