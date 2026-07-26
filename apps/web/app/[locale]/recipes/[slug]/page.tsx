'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { Price } from '@fv/ui';
import { Link } from '@/i18n/routing';
import { api, productPrice } from '@/lib/api';
import { addToCartApi } from '@/lib/cartApi';
import { setCartFromApi } from '@/store/cartSlice';

type RecipeDetail = {
  slug: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  imageUrl?: string | null;
  prepMinutes?: number | null;
  items: Array<{
    id: string;
    quantity?: string | null;
    product: {
      id: string;
      slug: string;
      nameEn: string;
      nameAr: string;
      basePrice?: number | string;
      images?: Array<{ url: string }>;
    };
  }>;
};

export default function RecipeDetailPage() {
  const params = useParams<{ slug: string }>();
  const locale = useLocale();
  const dispatch = useDispatch();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addOne(productId: string) {
    setBusy(true);
    setNote(null);
    try {
      const cart = await addToCartApi(productId, 1);
      dispatch(setCartFromApi(cart));
      setNote('Added to cart');
    } catch {
      setNote('Could not add to cart');
    } finally {
      setBusy(false);
    }
  }

  async function addAll() {
    if (!recipe?.items?.length) return;
    setBusy(true);
    setNote(null);
    try {
      let cart = null;
      for (const item of recipe.items) {
        cart = await addToCartApi(item.product.id, 1);
      }
      if (cart) dispatch(setCartFromApi(cart));
      setNote(`Added ${recipe.items.length} ingredients to cart`);
    } catch {
      setNote('Could not add all ingredients');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!params.slug) return;
    void api
      .get<{ recipe: RecipeDetail }>(`/api/content/recipes/${params.slug}`)
      .then(({ data }) => setRecipe(data.recipe))
      .catch(() => setError('Recipe not found'));
  }, [params.slug]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/recipes" className="mt-4 inline-block text-leaf-700 underline">
          Back to recipes
        </Link>
      </div>
    );
  }

  if (!recipe) {
    return <p className="px-4 py-20 text-center text-ink/55">Loading…</p>;
  }

  const title = locale === 'ar' ? recipe.titleAr : recipe.titleEn;
  const body = locale === 'ar' ? recipe.bodyAr : recipe.bodyEn;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <Link href="/recipes" className="text-sm font-medium text-leaf-700 hover:underline">
        ← Recipes
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold text-leaf-900 md:text-4xl">{title}</h1>
      {recipe.prepMinutes != null && (
        <p className="mt-2 text-sm text-ink/55">{recipe.prepMinutes} minutes</p>
      )}
      {recipe.imageUrl && (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl bg-leaf-100">
          <Image src={recipe.imageUrl} alt="" fill className="object-cover" sizes="800px" />
        </div>
      )}
      <div className="prose prose-neutral mt-8 max-w-none whitespace-pre-wrap text-ink/80">
        {body}
      </div>

      {recipe.items?.length > 0 && (
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold text-leaf-900">Shop ingredients</h2>
            <button
              type="button"
              disabled={busy}
              onClick={() => void addAll()}
              className="rounded-full bg-leaf-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Add all to cart
            </button>
          </div>
          {note ? <p className="mt-2 text-sm text-leaf-700">{note}</p> : null}
          <ul className="mt-4 space-y-3">
            {recipe.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-leaf-200 bg-white/80 px-4 py-3"
              >
                <Link href={`/products/${item.product.slug}`} className="font-medium hover:text-leaf-700">
                  {locale === 'ar' ? item.product.nameAr : item.product.nameEn}
                  {item.quantity ? ` · ${item.quantity}` : ''}
                </Link>
                <div className="flex items-center gap-3">
                  <Price
                    amount={productPrice(item.product)}
                    className="inline-flex items-center gap-1 text-sm font-semibold"
                    symbolClassName="inline-block h-3.5 w-3.5"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void addOne(item.product.id)}
                    className="text-xs font-semibold text-leaf-700 underline disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
