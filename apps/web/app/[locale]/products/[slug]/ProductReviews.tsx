'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { selectIsAuthenticated } from '@/store/authSlice';

type Review = {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
};

export function ProductReviews({ productId }: { productId: string }) {
  const isAuth = useSelector(selectIsAuthenticated);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState(0);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const { data } = await api.get<{ reviews: Review[]; average: number }>(
        `/api/reviews/product/${productId}`,
      );
      setReviews(data.reviews || []);
      setAverage(data.average || 0);
    } catch {
      setError('Could not load reviews');
    }
  }

  useEffect(() => {
    void load();
  }, [productId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAuth) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/api/reviews', {
        productId,
        rating,
        title: title.trim() || undefined,
        body,
      });
      setTitle('');
      setBody('');
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Could not save review',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-14 border-t border-leaf-200 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-leaf-900">Reviews</h2>
          <p className="mt-1 text-sm text-ink/60">
            {reviews.length
              ? `${average.toFixed(1)} / 5 · ${reviews.length} review${reviews.length === 1 ? '' : 's'}`
              : 'Be the first to review this product'}
          </p>
        </div>
      </div>

      {isAuth ? (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="mt-6 max-w-xl space-y-3 rounded-2xl border border-leaf-200 bg-white/80 p-4"
        >
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Rating</span>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full rounded-xl border border-leaf-300 px-3 py-2"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} stars
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Title (optional)</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-leaf-300 px-3 py-2"
              placeholder="Short headline"
              maxLength={120}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Your review</span>
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-xl border border-leaf-300 px-3 py-2"
              placeholder="Taste, freshness, packaging…"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-leaf-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-leaf-600 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Submit review'}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-ink/60">
          <Link href="/auth/login" className="font-medium text-leaf-700 underline">
            Sign in
          </Link>{' '}
          to leave a review.
        </p>
      )}

      <ul className="mt-8 space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-2xl border border-leaf-200 bg-white/70 px-4 py-3">
            <p className="text-sm font-semibold text-citrus-600">
              {'★'.repeat(r.rating)}
              {'☆'.repeat(5 - r.rating)}
            </p>
            {r.title ? <p className="mt-1 font-medium text-ink">{r.title}</p> : null}
            <p className="mt-1 text-sm text-ink/75">{r.body || '—'}</p>
            <p className="mt-2 text-xs text-ink/45">
              {r.user.firstName} {r.user.lastName} ·{' '}
              {new Date(r.createdAt).toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
