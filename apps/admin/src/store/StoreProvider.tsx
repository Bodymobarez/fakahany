'use client';

import { useRef, useEffect } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type AppStore } from './index';
import { hydrateAuth, clearCredentials, type AuthUser } from './authSlice';
import { api, clearAuth, getAuthToken, getRefreshToken, setAuthTokens } from '@/lib/api';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  useEffect(() => {
    const store = storeRef.current!;
    let cancelled = false;

    async function hydrate() {
      const token = getAuthToken();
      const refresh = getRefreshToken();
      const raw = localStorage.getItem('fv_admin_user');
      let cachedUser: AuthUser | null = null;
      if (raw) {
        try {
          cachedUser = JSON.parse(raw) as AuthUser;
        } catch {
          cachedUser = null;
        }
      }

      if (!token && !refresh) {
        clearAuth();
        if (!cancelled) store.dispatch(hydrateAuth({ user: null, accessToken: null }));
        return;
      }

      try {
        // Prefer validating current access token; interceptor will refresh if needed
        const { data } = await api.get<{ user: AuthUser }>('/api/auth/me');
        if (cancelled) return;
        const role = data.user?.role;
        if (role !== 'ADMIN' && role !== 'STAFF') {
          clearAuth();
          store.dispatch(clearCredentials());
          return;
        }
        localStorage.setItem('fv_admin_user', JSON.stringify(data.user));
        store.dispatch(
          hydrateAuth({
            user: data.user,
            accessToken: getAuthToken(),
          }),
        );
      } catch {
        if (!cancelled) {
          // If we still have a refresh token, try once explicitly
          if (refresh && !getAuthToken()) {
            try {
              const { data } = await api.post<{ accessToken: string; refreshToken?: string }>(
                '/api/auth/refresh',
                { refreshToken: refresh },
              );
              setAuthTokens(data.accessToken, data.refreshToken ?? null);
              const me = await api.get<{ user: AuthUser }>('/api/auth/me');
              if (cancelled) return;
              localStorage.setItem('fv_admin_user', JSON.stringify(me.data.user));
              store.dispatch(
                hydrateAuth({ user: me.data.user, accessToken: data.accessToken }),
              );
              return;
            } catch {
              /* fall through */
            }
          }
          clearAuth();
          store.dispatch(hydrateAuth({ user: null, accessToken: null }));
        }
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
