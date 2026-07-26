'use client';

import { useState, type FormEvent } from 'react';
import { Link } from '@/i18n/routing';
import { forgotPassword, parseApiError, resetPassword } from '@/lib/authApi';
import { AuthShell, authFieldClass, authPrimaryBtnClass } from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/auth/PasswordField';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [devToken, setDevToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestReset(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await forgotPassword(email.trim());
      setMessage(data.message || 'Check your email for a reset link.');
      if (data.devToken) {
        setDevToken(data.devToken);
        setToken(data.devToken);
        setStep('reset');
      }
    } catch (err) {
      setError(parseApiError(err, 'Could not request reset'));
    } finally {
      setLoading(false);
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await resetPassword({
        email: email.trim(),
        token: token.trim(),
        password,
      });
      setMessage('Password updated. You can sign in now.');
      setStep('request');
    } catch (err) {
      setError(parseApiError(err, 'Reset failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your account email. In development the reset token is shown below."
      footer={
        <Link href="/auth/login" className="font-medium text-leaf-700 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {step === 'request' ? (
        <form onSubmit={(e) => void requestReset(e)} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authFieldClass}
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-leaf-700">{message}</p> : null}
          <button type="submit" disabled={loading} className={authPrimaryBtnClass}>
            {loading ? '…' : 'Send reset token'}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => void onReset(e)} className="space-y-4">
          {devToken ? (
            <p className="rounded-xl bg-leaf-50 px-3 py-2 text-xs text-leaf-800">
              Dev token prefilled.
            </p>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Reset token</span>
            <input
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className={`${authFieldClass} font-mono text-xs`}
            />
          </label>
          <PasswordField
            label="New password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="new-password"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-leaf-700">{message}</p> : null}
          <button type="submit" disabled={loading} className={authPrimaryBtnClass}>
            {loading ? '…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
