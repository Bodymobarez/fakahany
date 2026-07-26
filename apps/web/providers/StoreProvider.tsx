'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type AppStore } from '@/store';
import { api, displayName, type ApiUser } from '@/lib/api';
import { fetchCart } from '@/lib/cartApi';
import { clearTokens, getAccessToken, setTokens } from '@/lib/session';
import { setCredentials, setHydrated, logout } from '@/store/authSlice';
import { setCartFromApi, setCartError } from '@/store/cartSlice';

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  useEffect(() => {
    const store = storeRef.current!;
    let cancelled = false;

    async function hydrate() {
      const token = getAccessToken();
      if (token) {
        try {
          const { data } = await api.get<{ user: ApiUser }>('/api/auth/me');
          if (!cancelled && data.user) {
            store.dispatch(
              setCredentials({
                user: {
                  id: data.user.id,
                  email: data.user.email || '',
                  name: displayName(data.user),
                  firstName: data.user.firstName,
                  lastName: data.user.lastName,
                  role: data.user.role,
                },
                token,
              }),
            );
          }
        } catch {
          clearTokens();
          store.dispatch(logout());
        }
      } else {
        store.dispatch(setHydrated());
      }

      try {
        const cart = await fetchCart();
        if (!cancelled) store.dispatch(setCartFromApi(cart));
      } catch {
        if (!cancelled) store.dispatch(setCartError());
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}

export { setTokens };
