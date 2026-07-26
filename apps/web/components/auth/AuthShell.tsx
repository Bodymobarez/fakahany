import type { ReactNode } from 'react';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-display text-3xl font-semibold text-heading">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
      <div className="mt-8">{children}</div>
      {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
    </div>
  );
}

export const authFieldClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25';

export const authPrimaryBtnClass =
  'w-full rounded-full bg-leaf-700 py-3 text-sm font-semibold text-white transition hover:bg-leaf-600 disabled:opacity-60';
