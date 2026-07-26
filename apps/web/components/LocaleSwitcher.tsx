'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const nextLocale = locale === 'ar' ? 'en' : 'ar';

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: nextLocale })}
      className="rounded-md border border-leaf-300/80 bg-white/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-leaf-800 transition hover:border-leaf-500 hover:bg-leaf-50"
      aria-label="Switch language"
    >
      {nextLocale === 'ar' ? 'عربي' : 'EN'}
    </button>
  );
}
