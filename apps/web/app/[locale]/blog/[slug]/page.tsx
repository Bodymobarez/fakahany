'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';

type Post = {
  slug: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  coverUrl?: string | null;
  publishedAt?: string | null;
};

export default function BlogPostPage() {
  const locale = useLocale();
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.slug) return;
    void api
      .get<{ post: Post }>(`/api/content/blog/${params.slug}`)
      .then(({ data }) => setPost(data.post))
      .catch(() => setError('Post not found'));
  }, [params.slug]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/blog" className="mt-6 inline-block text-leaf-700 underline">
          Back to blog
        </Link>
      </div>
    );
  }

  if (!post) {
    return <p className="mx-auto max-w-3xl px-4 py-20 text-ink/60">Loading…</p>;
  }

  const title = locale === 'ar' ? post.titleAr : post.titleEn;
  const body = locale === 'ar' ? post.bodyAr || post.bodyEn : post.bodyEn || post.bodyAr;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <Link href="/blog" className="text-sm font-medium text-leaf-700 hover:underline">
        ← Blog
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold text-leaf-900 md:text-4xl">
        {title}
      </h1>
      {post.publishedAt ? (
        <p className="mt-2 text-sm text-ink/50">
          {new Date(post.publishedAt).toLocaleDateString()}
        </p>
      ) : null}
      {post.coverUrl ? (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl bg-leaf-100">
          <Image src={post.coverUrl} alt="" fill className="object-cover" sizes="800px" />
        </div>
      ) : null}
      <div className="prose prose-leaf mt-8 max-w-none whitespace-pre-wrap text-ink/80">
        {body}
      </div>
    </article>
  );
}
