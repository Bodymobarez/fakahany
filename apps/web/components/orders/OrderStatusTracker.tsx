'use client';

import { ORDER_TRACK_STEPS, orderStatusLabel, orderTrackStepIndex } from '@/lib/orderUi';

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.42l2.543 2.544 6.543-6.544a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function OrderStatusTracker({ status }: { status: string }) {
  const step = orderTrackStepIndex(status);
  const isTerminal = step < 0;

  if (isTerminal) {
    return (
      <div className="rounded-2xl border border-leaf-200 bg-white px-4 py-5 text-center shadow-sm">
        <p className="text-sm font-semibold text-ink">{orderStatusLabel(status)}</p>
        <p className="mt-1 text-xs text-ink/55">This order is no longer in the delivery pipeline.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-leaf-200 bg-white px-3 py-6 shadow-sm sm:px-6">
      <ol className="relative flex items-start justify-between gap-1">
        {ORDER_TRACK_STEPS.map((s, i) => {
          const done = i <= step;
          const isLast = i === ORDER_TRACK_STEPS.length - 1;
          return (
            <li key={s.key} className="relative flex flex-1 flex-col items-center text-center">
              {!isLast ? (
                <span
                  aria-hidden
                  className={`absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-3.5 h-1 rounded-full ${
                    i < step ? 'bg-leaf-700' : 'bg-leaf-100'
                  }`}
                />
              ) : null}
              <span
                className={`relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  done
                    ? 'border-leaf-700 bg-leaf-700 text-white'
                    : 'border-leaf-200 bg-white text-transparent'
                }`}
              >
                <CheckIcon className="h-4 w-4" />
              </span>
              <span
                className={`mt-2 max-w-[5.5rem] text-[10px] font-semibold leading-tight sm:max-w-none sm:text-xs ${
                  done ? 'text-leaf-800' : 'text-ink/40'
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
