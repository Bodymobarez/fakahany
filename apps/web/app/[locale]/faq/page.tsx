'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';

type Faq = {
  id: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
};

export default function FaqPage() {
  const locale = useLocale();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<{ faqs: Faq[] }>('/api/content/faqs')
      .then(({ data }) => setFaqs(data.faqs || []))
      .catch(() => setError('Could not load FAQs'));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-leaf-900 md:text-4xl">
        Help Center / FAQ
      </h1>
      <p className="mt-2 text-ink/65">Answers about delivery, VAT, and shopping with Fresh Harvest.</p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      <div className="mt-8 space-y-3">
        {faqs.map((f) => (
          <details
            key={f.id}
            className="group rounded-2xl border border-leaf-200 bg-white/80 px-5 py-4 open:shadow-sm"
          >
            <summary className="cursor-pointer list-none font-semibold text-ink marker:content-none">
              {locale === 'ar' ? f.questionAr : f.questionEn}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              {locale === 'ar' ? f.answerAr : f.answerEn}
            </p>
          </details>
        ))}
        {!error && faqs.length === 0 && (
          <p className="text-sm text-ink/55">No FAQs published yet.</p>
        )}
      </div>
    </div>
  );
}
