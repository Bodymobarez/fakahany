'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';

const KEY = 'fv_cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  function save(marketing: boolean) {
    localStorage.setItem(KEY, JSON.stringify({ necessary: true, marketing, at: Date.now() }));
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-emerald-900/10 bg-white/95 p-4 shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-700">
          We use necessary cookies to run the store and optional cookies for marketing. See our{' '}
          <Link href="/privacy" className="underline text-emerald-800">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => save(false)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            Necessary only
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            className="rounded-md bg-emerald-800 px-3 py-2 text-sm text-white"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
