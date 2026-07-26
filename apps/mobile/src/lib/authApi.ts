import { apiFetch as publicFetch } from './api';
import { setToken as persistToken } from './auth';

export type OAuthProvider = 'google' | 'apple' | 'facebook';

let deviceId: string | null = null;
export function getDeviceId() {
  if (!deviceId) {
    deviceId = `mobile_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
  return deviceId;
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
  totp?: string;
}) {
  return publicFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function requestOtp(phone: string) {
  return publicFetch('/api/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string) {
  return publicFetch('/api/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
}

export async function loginWithOAuth(provider: OAuthProvider, totp?: string) {
  return publicFetch('/api/auth/oauth', {
    method: 'POST',
    body: JSON.stringify({ provider, deviceId: getDeviceId(), totp }),
  });
}

export async function registerCustomer(payload: Record<string, unknown>) {
  return publicFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function forgotPassword(email: string) {
  return publicFetch('/api/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(input: {
  email: string;
  token: string;
  password: string;
}) {
  return publicFetch('/api/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function persistSession(accessToken?: string) {
  if (accessToken) await persistToken(accessToken);
}
