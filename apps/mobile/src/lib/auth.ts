import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL } from './api';

const TOKEN_KEY = 'fv_customer_access_token';

let accessToken: string | null = null;
let ready = false;

async function persist(token: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function hydrateToken() {
  if (ready) return accessToken;
  try {
    if (Platform.OS === 'web') {
      accessToken = localStorage.getItem(TOKEN_KEY);
    } else {
      accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
    }
  } catch {
    accessToken = null;
  }
  ready = true;
  return accessToken;
}

export function getToken() {
  return accessToken;
}

export async function setToken(token: string) {
  accessToken = token;
  await persist(token);
}

export async function clearToken() {
  accessToken = null;
  await persist(null);
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  if (!ready) await hydrateToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || `HTTP ${res.status}`);
  }
  return data;
}
