'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useDispatch } from 'react-redux';
import { Link, useRouter } from '@/i18n/routing';
import {
  finishAuthSession,
  loginWithOAuth,
  loginWithPassword,
  parseApiError,
  requestOtp,
  startOAuthRedirect,
  verifyOtp,
  type OAuthProvider,
} from '@/lib/authApi';
import { AuthShell, authFieldClass, authPrimaryBtnClass } from '@/components/auth/AuthShell';
import { ModeTabs } from '@/components/auth/ModeTabs';
import { PasswordField } from '@/components/auth/PasswordField';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';

type Mode = 'mobile' | 'password';

function oauthErrorMessage(code: string | null) {
  if (!code) return null;
  const decoded = decodeURIComponent(code);
  if (decoded.endsWith('_not_configured')) {
    const provider = decoded.replace(/_not_configured$/, '');
    return `${provider[0]!.toUpperCase()}${provider.slice(1)} sign-in is not configured yet. Ask your admin to set the OAuth app credentials on the API.`;
  }
  if (decoded === 'access_denied') return 'Sign-in was cancelled.';
  return decoded.replace(/_/g, ' ');
}

function LoginPageInner() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const search = useSearchParams();
  const dispatch = useDispatch();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('mobile');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState('+971');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devHint, setDevHint] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [totp, setTotp] = useState('');
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    const msg = oauthErrorMessage(search.get('oauthError'));
    if (msg) setError(msg);
  }, [search]);

  async function complete(data: {
    user: Parameters<typeof finishAuthSession>[1]['user'];
    accessToken: string;
    refreshToken: string;
  }) {
    await finishAuthSession(dispatch, data);
    if (data.user.role === 'DRIVER') {
      router.push('/driver');
      return;
    }
    if (data.user.role === 'ADMIN' || data.user.role === 'STAFF') {
      router.push('/account');
      return;
    }
    router.push('/');
  }

  async function sendOtp() {
    setError(null);
    setLoading(true);
    setDevHint(null);
    try {
      const data = await requestOtp(phone.trim());
      setOtpSent(true);
      if (data.devCode) setDevHint(`Dev code: ${data.devCode}`);
    } catch (err) {
      setError(parseApiError(err, 'Could not send OTP'));
    } finally {
      setLoading(false);
    }
  }

  async function onMobileSubmit(e: FormEvent) {
    e.preventDefault();
    if (!otpSent) {
      await sendOtp();
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await verifyOtp(phone.trim(), otpCode.trim());
      if (!data.accessToken) throw new Error('OTP verified but no session issued');
      await complete(data);
    } catch (err) {
      setError(parseApiError(err, 'Invalid or expired OTP'));
    } finally {
      setLoading(false);
    }
  }

  async function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (oauthProvider && needs2fa) {
        const data = await loginWithOAuth(oauthProvider, { totp });
        if (data.requires2fa) return;
        if (!data.user || !data.accessToken || !data.refreshToken) throw new Error('Login incomplete');
        await complete({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        return;
      }

      const data = await loginWithPassword({
        email,
        password,
        totp: needs2fa ? totp : undefined,
      });
      if (data.requires2fa) {
        setNeeds2fa(true);
        return;
      }
      if (!data.user || !data.accessToken || !data.refreshToken) throw new Error('Login incomplete');
      await complete({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
    } catch (err) {
      setError(parseApiError(err, 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  }

  function onSocial(provider: OAuthProvider) {
    setError(null);
    setLoading(true);
    setOauthProvider(provider);
    // Full redirect to Google / Apple / Facebook via the API.
    startOAuthRedirect(provider, { locale });
  }

  return (
    <AuthShell
      title={t('loginTitle')}
      subtitle={t('loginSub')}
      footer={
        <>
          {t('noAccount')}{' '}
          <Link href="/auth/register" className="font-medium text-leaf-700 hover:underline">
            {t('registerCta')}
          </Link>
        </>
      }
    >
      <ModeTabs
        value={mode}
        onChange={setMode}
        options={[
          { id: 'mobile', label: t('mobileNumber') },
          { id: 'password', label: t('email') },
        ]}
      />

      {mode === 'mobile' ? (
        <form onSubmit={(e) => void onMobileSubmit(e)} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink/80">{t('mobileNumber')}</span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+9715…"
              className={authFieldClass}
            />
          </label>
          {otpSent ? (
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink/80">{t('otpCode')}</span>
              <input
                inputMode="numeric"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                className={authFieldClass}
              />
            </label>
          ) : null}
          {devHint ? <p className="text-xs text-leaf-700">{devHint}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || phone.trim().length < 8 || (otpSent && otpCode.length !== 6)}
            className={authPrimaryBtnClass}
          >
            {loading ? '…' : otpSent ? t('verifySignIn') : t('sendOtp')}
          </button>
          {otpSent ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void sendOtp()}
              className="w-full text-sm font-medium text-leaf-700 underline"
            >
              {t('resendCode')}
            </button>
          ) : null}
        </form>
      ) : (
        <form onSubmit={(e) => void onPasswordSubmit(e)} className="mt-6 space-y-4">
          {!oauthProvider ? (
            <>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-ink/80">{t('email')}</span>
                <input
                  name="email"
                  type="email"
                  required={!needs2fa}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={authFieldClass}
                />
              </label>
              <PasswordField
                label={t('password')}
                value={password}
                onChange={setPassword}
                required={!needs2fa}
                showLabel={t('showPassword')}
                hideLabel={t('hidePassword')}
              />
            </>
          ) : null}
          {needs2fa ? (
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink/80">Authenticator code</span>
              <input
                inputMode="numeric"
                required
                maxLength={6}
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                className={authFieldClass}
              />
            </label>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className={authPrimaryBtnClass}>
            {loading ? '…' : needs2fa ? t('verifySignIn') : t('loginCta')}
          </button>
          <p className="text-center text-sm">
            <Link href="/auth/forgot" className="font-medium text-leaf-700 hover:underline">
              {t('forgot')}
            </Link>
          </p>
        </form>
      )}

      <SocialLoginButtons
        loading={loading}
        dividerLabel={t('orContinueWith')}
        labels={{
          google: t('continueGoogle'),
          apple: t('continueApple'),
          facebook: t('continueFacebook'),
        }}
        onSelect={(p) => void onSocial(p)}
      />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-20 text-center text-ink/60">Loading…</div>}>
      <LoginPageInner />
    </Suspense>
  );
}
