'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.update().catch(() => undefined))
      .catch(() => {
        // registration stub — ignore failures in local/dev
      });
  }, []);

  return null;
}
