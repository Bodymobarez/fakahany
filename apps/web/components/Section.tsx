import type { ReactNode } from 'react';
import { Link } from '@/i18n/routing';

type SectionProps = {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: ReactNode;
  className?: string;
};

export function Section({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
  children,
  className = '',
}: SectionProps) {
  return (
    <section className={`mx-auto max-w-6xl px-4 py-12 md:px-6 ${className}`}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-heading md:text-3xl">
            {title}
          </h2>
          {subtitle ? <p className="mt-1 max-w-xl text-sm text-muted">{subtitle}</p> : null}
        </div>
        {viewAllHref ? (
          <Link
            href={viewAllHref as '/products'}
            className="shrink-0 text-sm font-medium text-leaf-700 underline-offset-4 hover:underline"
          >
            {viewAllLabel ?? 'View all'}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
