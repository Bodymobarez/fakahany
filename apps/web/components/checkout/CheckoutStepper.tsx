import { Link } from '@/i18n/routing';

type Step = 'basket' | 'checkout' | 'payment';

const STEPS: Array<{ id: Step; label: string; href?: string }> = [
  { id: 'basket', label: 'Basket', href: '/cart' },
  { id: 'checkout', label: 'Checkout', href: '/checkout' },
  { id: 'payment', label: 'Payment' },
];

export function CheckoutStepper({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <nav aria-label="Checkout progress" className="mb-10">
      <ol className="flex items-center justify-center gap-0">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const circle = (
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                done
                  ? 'bg-leaf-700 text-white'
                  : active
                    ? 'bg-leaf-700 text-white ring-4 ring-leaf-700/20'
                    : 'bg-surface-2 text-muted ring-1 ring-line'
              }`}
            >
              {done ? (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 011.414-1.42l2.543 2.544 6.543-6.544a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </span>
          );

          return (
            <li key={step.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                {done && step.href ? (
                  <Link href={step.href} className="transition hover:opacity-80">
                    {circle}
                  </Link>
                ) : (
                  circle
                )}
                <span
                  className={`text-xs font-medium ${
                    active || done ? 'text-heading' : 'text-muted'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <div
                  className={`mx-3 mb-5 h-px w-12 sm:w-20 ${
                    index < currentIndex ? 'bg-leaf-700' : 'bg-line'
                  }`}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
