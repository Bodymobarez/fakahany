import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { api } from '@/lib/api';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

type CmsPage = {
  slug: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
};

export default async function CmsPageView({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  let page: CmsPage | null = null;
  try {
    const { data } = await api.get<{ page: CmsPage }>(`/api/content/pages/${slug}`);
    page = data.page;
  } catch {
    page = null;
  }
  if (!page) notFound();

  const title = locale === 'ar' ? page.titleAr || page.titleEn : page.titleEn;
  const body = locale === 'ar' ? page.bodyAr || page.bodyEn : page.bodyEn;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-leaf-900 md:text-4xl">{title}</h1>
      <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-ink/80">{body}</div>
    </article>
  );
}
