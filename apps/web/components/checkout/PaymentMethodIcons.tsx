type MethodId =
  | 'COD'
  | 'STRIPE'
  | 'TABBY'
  | 'TAMARA'
  | 'APPLE_PAY'
  | 'GOOGLE_PAY'
  | 'WALLET'
  | string;

const tileClass = 'block h-full w-full rounded-lg object-cover';

export function PaymentMethodIcon({ id, className = '' }: { id: MethodId; className?: string }) {
  const merged = `${tileClass} ${className}`.trim();

  switch (id) {
    case 'COD':
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/payment-aed-100.png"
          alt="100 UAE Dirhams"
          className={merged}
          width={192}
          height={128}
        />
      );
    case 'STRIPE':
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/payment-card.svg"
          alt="Credit card"
          className={merged}
          width={96}
          height={64}
        />
      );
    case 'TABBY':
      return (
        <svg viewBox="0 0 48 32" className={merged} aria-hidden preserveAspectRatio="none">
          <rect width="48" height="32" rx="6" fill="#3BFFC2" />
          <text x="24" y="20" textAnchor="middle" fontSize="11" fontWeight="700" fill="#111">
            tabby
          </text>
        </svg>
      );
    case 'TAMARA':
      return (
        <svg viewBox="0 0 48 32" className={merged} aria-hidden preserveAspectRatio="none">
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
          alt="Apple Pay"
          className={merged}
          width={96}
          height={64}
        />
      );
    case 'GOOGLE_PAY':
      return (
        <svg viewBox="0 0 72 48" className={merged} aria-hidden preserveAspectRatio="xMidYMid meet">
          <rect width="72" height="48" rx="8" fill="#fff" stroke="#e5e7eb" />
          <text
            x="36"
            y="30"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="14"
            fontWeight="600"
            fill="#3c4043"
          >
            <tspan fill="#4285F4">G</tspan>
            <tspan fill="#EA4335">o</tspan>
            <tspan fill="#FBBC04">o</tspan>
            <tspan fill="#4285F4">g</tspan>
            <tspan fill="#34A853">l</tspan>
            <tspan fill="#EA4335">e</tspan>
            <tspan fill="#3c4043"> Pay</tspan>
          </text>
        </svg>
      );
    case 'WALLET':
      return (
        <svg viewBox="0 0 48 32" className={merged} aria-hidden preserveAspectRatio="none">
          <rect width="48" height="32" rx="6" fill="#eff6ff" />
          <path
            d="M12 10h22a3 3 0 013 3v10a3 3 0 01-3 3H12a3 3 0 01-3-3V13a3 3 0 013-3zm22 7h5"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 32" className={merged} aria-hidden preserveAspectRatio="none">
          <rect width="48" height="32" rx="6" fill="#f1f5f9" />
          <circle cx="24" cy="16" r="6" fill="#94a3b8" />
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
