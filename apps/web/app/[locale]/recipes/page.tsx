'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';

type Recipe = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  imageUrl?: string | null;
  prepMinutes?: number | null;
};

export default function RecipesPage() {
  const locale = useLocale();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<{ recipes: Recipe[] }>('/api/content/recipes')
      .then(({ data }) => setRecipes(data.recipes || []))
      .catch(() => setError('Could not load recipes'));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-leaf-900 md:text-4xl">Recipes</h1>
      <p className="mt-2 max-w-xl text-ink/65">
        Fresh ideas using seasonal produce from Fresh Harvest.
      </p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((r) => (
          <Link
            key={r.id}
            href={`/recipes/${r.slug}`}
            className="group overflow-hidden rounded-2xl border border-leaf-200 bg-white/80 shadow-sm transition hover:-translate-y-0.5 hover:border-leaf-400"
          >
            <div className="relative aspect-[16/10] bg-leaf-100">
              {r.imageUrl ? (
                <Image src={r.imageUrl} alt="" fill className="object-cover" sizes="33vw" />
              ) : null}
            </div>
            <div className="p-4">
              <h2 className="font-display text-lg font-semibold text-ink group-hover:text-leaf-700">
                {locale === 'ar' ? r.titleAr : r.titleEn}
              </h2>
              {r.prepMinutes != null && (
                <p className="mt-1 text-xs text-ink/50">{r.prepMinutes} min</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {!error && recipes.length === 0 && (
        <p className="mt-8 text-sm text-ink/55">Recipes coming soon.</p>
      )}
    </div>
  );
}
