'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';

type Post = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn?: string;
  excerptAr?: string;
  coverUrl?: string | null;
  publishedAt?: string | null;
};

export default function BlogPage() {
  const locale = useLocale();
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<{ posts: Post[] }>('/api/content/blog')
      .then(({ data }) => setPosts(data.posts || []))
      .catch(() => setError('Could not load blog'));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-leaf-900 md:text-4xl">Blog</h1>
      <p className="mt-2 max-w-xl text-ink/65">
        Tips, seasonality, and stories from Fresh Harvest UAE.
      </p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}`}
            className="group overflow-hidden rounded-2xl border border-leaf-200 bg-white/80 shadow-sm transition hover:-translate-y-0.5 hover:border-leaf-400"
          >
            <div className="relative aspect-[16/10] bg-leaf-100">
              {p.coverUrl ? (
                <Image src={p.coverUrl} alt="" fill className="object-cover" sizes="33vw" />
              ) : null}
            </div>
            <div className="p-4">
              <h2 className="font-display text-lg font-semibold text-ink group-hover:text-leaf-700">
                {locale === 'ar' ? p.titleAr : p.titleEn}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm text-ink/65">
                {locale === 'ar' ? p.excerptAr || p.excerptEn : p.excerptEn || p.excerptAr}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {!error && posts.length === 0 && (
        <p className="mt-8 text-sm text-ink/55">Posts coming soon.</p>
      )}
    </div>
  );
}
