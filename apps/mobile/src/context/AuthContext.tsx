import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, clearToken, getToken, hydrateToken, setToken } from '../lib/auth';

type AuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string;
  lastName?: string;
};

type AuthContextValue = {
  ready: boolean;
  token: string | null;
  user: AuthUser | null;
  refresh: () => Promise<void>;
  signIn: (accessToken: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setLocalToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const refresh = useCallback(async () => {
    const t = getToken();
    setLocalToken(t);
    if (!t) {
      setUser(null);
      return;
    }
    try {
      const data = await apiFetch('/api/auth/me');
      setUser(data.user || null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await hydrateToken();
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      token,
      user,
      refresh,
      async signIn(accessToken: string) {
        await setToken(accessToken);
        await refresh();
      },
      async signOut() {
        await clearToken();
        setLocalToken(null);
        setUser(null);
      },
    }),
    [ready, token, user, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
