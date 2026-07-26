type MethodId =
  | 'COD'
  | 'STRIPE'
  | 'TABBY'
  | 'TAMARA'
  | 'APPLE_PAY'
  | 'GOOGLE_PAY'
  | 'WALLET'
  | string;

export function PaymentMethodIcon({ id, className = 'h-7 w-7' }: { id: MethodId; className?: string }) {
  switch (id) {
    case 'COD':
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/payment-aed-100.png"
          alt=""
          className={`${className} rounded-md object-cover`}
          width={96}
          height={64}
        />
      );
    case 'STRIPE':
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/payment-card.svg"
          alt=""
          className={className}
          width={96}
          height={64}
        />
      );
    case 'TABBY':
      return (
        <svg viewBox="0 0 48 32" className={className} aria-hidden>
          <rect width="48" height="32" rx="6" fill="#3BFFC2" />
          <text x="24" y="20" textAnchor="middle" fontSize="11" fontWeight="700" fill="#111">
            tabby
          </text>
        </svg>
      );
    case 'TAMARA':
      return (
        <svg viewBox="0 0 48 32" className={className} aria-hidden>
          <rect width="48" height="32" rx="6" fill="#1A1A2E" />
          <text x="24" y="20" textAnchor="middle" fontSize="10" fontWeight="700" fill="#F5A623">
            tamara
          </text>
        </svg>
      );
    case 'APPLE_PAY':
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/payment-apple-pay.png"
          alt=""
          className={`${className} rounded-md object-contain`}
          width={96}
          height={64}
        />
      );
    case 'GOOGLE_PAY':
      return (
        <svg viewBox="0 0 48 32" className={className} aria-hidden>
          <rect width="48" height="32" rx="6" fill="#fff" stroke="#e5e7eb" />
          <path
            d="M23.2 16.5v-2.3h6.3c.1.5.1 1.1.1 1.7 0 2.1-.6 4.3-2.4 5.9-1.6 1.5-3.6 2.3-6.2 2.3-4.9 0-9-4-9-9s4.1-9 9-9c2.5 0 4.3.9 5.7 2.2l-1.6 1.6c-1-.9-2.3-1.6-4.1-1.6-3.4 0-6.1 2.8-6.1 6.8s2.7 6.8 6.1 6.8c2.2 0 3.5-.9 4.3-1.7.6-.6 1.1-1.6 1.2-2.9h-5.3z"
            fill="#4285F4"
          />
          <path
            d="M34.8 11.2c2.3 0 4.3 1.6 4.3 4.6s-2 4.6-4.3 4.6-4.3-1.6-4.3-4.6 2-4.6 4.3-4.6zm0 1.5c-1.3 0-2.4 1.1-2.4 3.1s1.1 3.1 2.4 3.1 2.4-1.1 2.4-3.1-1.1-3.1-2.4-3.1zM42.3 20.2V9.4h1.8v10.8h-1.8z"
            fill="#3c4043"
          />
        </svg>
      );
    case 'WALLET':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden>
          <rect width="32" height="32" rx="8" fill="#eff6ff" />
          <path
            d="M8 11h14a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2zm14 5h3"
            fill="none"
            stroke="#2563eb"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden>
          <rect width="32" height="32" rx="8" fill="#f1f5f9" />
          <circle cx="16" cy="16" r="5" fill="#94a3b8" />
        </svg>
      );
  }
}

export function paymentMethodShortLabel(id: MethodId, fallback: string) {
  switch (id) {
    case 'COD':
      return 'Cash';
    case 'STRIPE':
      return 'Credit/Debit Card';
    case 'TABBY':
      return 'Tabby';
    case 'TAMARA':
      return 'Tamara';
    case 'APPLE_PAY':
      return 'Apple Pay';
    case 'GOOGLE_PAY':
      return 'Google Pay';
    case 'WALLET':
      return 'Wallet';
    default:
      return fallback;
  }
}
