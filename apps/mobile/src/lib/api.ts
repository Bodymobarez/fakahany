import Constants from 'expo-constants';

export const API_URL =
  (Constants.expoConfig?.extra?.API_URL as string | undefined) ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000';

export async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || res.statusText || `HTTP ${res.status}`);
  }
  return data;
}
