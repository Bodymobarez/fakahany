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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}
