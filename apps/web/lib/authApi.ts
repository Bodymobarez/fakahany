import { api, displayName, type ApiUser } from '@/lib/api';
import { mergeGuestCart } from '@/lib/cartApi';
import { getSessionId, setTokens } from '@/lib/session';
import { setCredentials } from '@/store/authSlice';
import { setCartFromApi } from '@/store/cartSlice';
import type { AppDispatch } from '@/store';

export type AuthTokens = {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
};

export type OAuthProvider = 'google' | 'apple' | 'facebook';

export function parseApiError(err: unknown, fallback = 'Something went wrong') {
  const data = (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
    ?.response?.data;
  return data?.error?.message || data?.message || fallback;
}

export async function finishAuthSession(
  dispatch: AppDispatch,
  data: AuthTokens,
) {
  setTokens(data.accessToken, data.refreshToken);
  dispatch(
    setCredentials({
      user: {
        id: data.user.id,
        email: data.user.email || data.user.phone || '',
        name: displayName(data.user),
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        role: data.user.role,
      },
      token: data.accessToken,
    }),
  );
  try {
    const cart = await mergeGuestCart();
    if (cart) dispatch(setCartFromApi(cart));
  } catch {
    /* merge optional */
  }
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
  totp?: string;
}) {
  const { data } = await api.post<
    AuthTokens & { requires2fa?: boolean; user?: ApiUser; accessToken?: string; refreshToken?: string }
  >('/api/auth/login', input);
  return data;
}

export async function requestOtp(phone: string) {
  const { data } = await api.post<{ ok: boolean; devCode?: string }>('/api/auth/otp/request', {
    phone,
  });
  return data;
}

export async function verifyOtp(phone: string, code: string) {
  const { data } = await api.post<AuthTokens>('/api/auth/otp/verify', { phone, code });
  return data;
}

export async function loginWithOAuth(
  provider: OAuthProvider,
  options?: { totp?: string },
) {
  const { data } = await api.post<
    AuthTokens & { requires2fa?: boolean; user?: ApiUser; accessToken?: string; refreshToken?: string }
  >('/api/auth/oauth', {
    provider,
    deviceId: getSessionId() || `web_${Date.now()}`,
    totp: options?.totp,
  });
  return data;
}

export async function registerCustomer(payload: Record<string, unknown>) {
  const { data } = await api.post<AuthTokens>('/api/auth/register', payload);
  return data;
}

export async function forgotPassword(email: string) {
  const { data } = await api.post<{ ok: boolean; message?: string; devToken?: string }>(
    '/api/auth/password/forgot',
    { email },
  );
  return data;
}

export async function resetPassword(input: {
  email: string;
  token: string;
  password: string;
}) {
  const { data } = await api.post<{ ok: boolean }>('/api/auth/password/reset', input);
  return data;
}
