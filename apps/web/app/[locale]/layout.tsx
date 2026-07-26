import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { DM_Sans, Fraunces } from 'next/font/google';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CookieConsent } from '@/components/CookieConsent';
import { StoreProvider } from '@/providers/StoreProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { PwaRegister } from '@/providers/PwaRegister';
import { routing } from '@/i18n/routing';
import '../globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Fresh Harvest',
    template: '%s · Fresh Harvest',
  },
  description: 'Farm-fresh fruits and vegetables delivered across the UAE.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Fresh Harvest',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#1f7a3a',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'en' | 'ar')) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className={`${fraunces.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <StoreProvider>
            <ThemeProvider>
              <PwaRegister />
              <Header />
              <main className="min-h-[70vh]">{children}</main>
              <Footer />
              <CookieConsent />
            </ThemeProvider>
          </StoreProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
