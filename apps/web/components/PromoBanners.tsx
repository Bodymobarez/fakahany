import Image from 'next/image';
import { Link } from '@/i18n/routing';

export type PromoBanner = {
  id: string;
  titleEn: string;
  titleAr: string;
  imageUrl: string;
  linkUrl?: string | null;
};

export function PromoBanners({
  banners,
  locale,
}: {
  banners: PromoBanner[];
  locale: string;
}) {
  if (!banners.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="grid gap-4 md:grid-cols-2">
        {banners.slice(0, 4).map((b) => {
          const title = locale === 'ar' ? b.titleAr : b.titleEn;
          const href = b.linkUrl || '/products';
          const inner = (
            <div className="group relative aspect-[21/9] overflow-hidden rounded-2xl bg-leaf-100 md:aspect-[16/7]">
              <Image
                src={b.imageUrl}
                alt={title}
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-leaf-900/70 via-transparent to-transparent" />
              <p className="absolute bottom-4 left-4 right-4 font-display text-lg font-semibold text-white md:text-xl">
                {title}
              </p>
            </div>
          );
          if (href.startsWith('http')) {
            return (
              <a key={b.id} href={href} target="_blank" rel="noreferrer">
                {inner}
              </a>
            );
          }
          if (href.startsWith('#')) {
            return (
              <a key={b.id} href={href}>
                {inner}
              </a>
            );
          }
          return (
            <Link key={b.id} href={href}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
