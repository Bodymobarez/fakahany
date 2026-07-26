import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export async function Footer() {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-surface-2">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-6">
        <div>
          <p className="font-display text-2xl font-semibold text-heading">Fresh Harvest</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{t('tagline')}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-leaf-700">{t('shop')}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            <li>
              <Link href="/products" className="text-muted hover:text-leaf-700">
                {t('shop')}
              </Link>
            </li>
            <li>
              <Link href="/recipes" className="text-muted hover:text-leaf-700">
                Recipes
              </Link>
            </li>
            <li>
              <Link href="/blog" className="text-muted hover:text-leaf-700">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/vendors" className="text-muted hover:text-leaf-700">
                Vendors
              </Link>
            </li>
            <li>
              <Link href="/cart" className="text-muted hover:text-leaf-700">
                Cart
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-leaf-700">{t('help')}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            <li>
              <Link href="/pages/about" className="text-muted hover:text-leaf-700">
                About
              </Link>
            </li>
            <li>
              <Link href="/faq" className="text-muted hover:text-leaf-700">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-muted hover:text-leaf-700">
                {t('privacy')}
              </Link>
            </li>
            <li>
              <span className="text-muted">{t('contact')}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        {t('rights', { year })}
      </div>
    </footer>
  );
}
