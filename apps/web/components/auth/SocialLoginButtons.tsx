'use client';

import type { OAuthProvider } from '@/lib/authApi';

const PROVIDERS: Array<{ id: OAuthProvider; label: string; mark: string; markClass: string }> = [
  { id: 'google', label: 'Continue with Google', mark: 'G', markClass: 'text-[#4285F4]' },
  { id: 'apple', label: 'Continue with Apple', mark: '', markClass: '' },
  { id: 'facebook', label: 'Continue with Facebook', mark: 'f', markClass: 'text-[#1877F2]' },
];

export function SocialLoginButtons({
  loading,
  dividerLabel,
  labels,
  onSelect,
}: {
  loading?: boolean;
  dividerLabel: string;
  labels: Record<OAuthProvider, string>;
  onSelect: (provider: OAuthProvider) => void;
}) {
  return (
    <div className="mt-8">
      <div className="relative mb-4 text-center text-xs font-medium uppercase tracking-wide text-ink/45">
        <span className="relative z-10 bg-[var(--background,#f7faf7)] px-3">{dividerLabel}</span>
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-leaf-200" />
      </div>
      <div className="grid gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={loading}
            onClick={() => onSelect(p.id)}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-leaf-200 bg-white py-2.5 text-sm font-semibold text-ink transition hover:bg-leaf-50 disabled:opacity-60"
          >
            {p.id === 'apple' ? (
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0 fill-current text-ink"
                aria-hidden
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.22-1.98 1.08-3.13-1.05.04-2.31.7-3.06 1.58-.66.76-1.23 1.98-1.07 3.14 1.13.09 2.29-.58 3.05-1.59" />
              </svg>
            ) : (
              <span className={`text-base font-bold ${p.markClass}`} aria-hidden>
                {p.mark}
              </span>
            )}
            {labels[p.id]}
          </button>
        ))}
      </div>
    </div>
  );
}
