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
        <svg viewBox="0 0 32 32" className={className} aria-hidden>
          <rect width="32" height="32" rx="8" fill="#ecfdf5" />
          <path
            d="M8 12h16v10H8V12zm0 3h16M16 15v7"
            fill="none"
            stroke="#0f766e"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="16" cy="9" r="2.2" fill="#0f766e" />
        </svg>
      );
    case 'STRIPE':
      return (
        <svg viewBox="0 0 48 32" className={className} aria-hidden>
          <rect width="48" height="32" rx="6" fill="#635BFF" />
          <path
            d="M21.2 13.2c0-.9.7-1.3 2-1.3 1.8 0 4 .5 5.8 1.5V9.2A19 19 0 0 0 23.2 8c-3.9 0-6.5 2-6.5 5.4 0 5.3 7.3 4.4 7.3 6.7 0 1.1-.9 1.4-2.3 1.4-1.9 0-4.4-.8-6.3-1.8v4.3A20.4 20.4 0 0 0 22.9 25c4.1 0 6.7-2 6.7-5.4-.1-5.7-7.4-4.7-7.4-6.4z"
            fill="#fff"
          />
        </svg>
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
        <svg viewBox="0 0 48 32" className={className} aria-hidden>
          <rect width="48" height="32" rx="6" fill="#111" />
          <path
            d="M14.6 11.2c.5-.6.9-1.5.8-2.4-0.8 0-1.8.5-2.4 1.2-.5.6-.9 1.5-.8 2.3.9.1 1.8-.4 2.4-1.1zm.8 1.3c-1.3-.1-2.4.7-3 .7-.6 0-1.5-.7-2.5-.7-1.3 0-2.5.7-3.1 1.9-1.4 2.3-.3 5.8 1 7.7.6.9 1.4 2 2.4 1.9 1 0 1.3-.6 2.5-.6s1.5.6 2.5.6 1.7-1 2.3-1.9c.7-1 1-2 1-2.1-.1 0-1.8-.7-1.8-2.7 0-1.7 1.4-2.5 1.4-2.5-.8-1.1-2-1.3-2.7-1.3z"
            fill="#fff"
          />
          <path
            d="M24.2 12.2h-2.1v8.6h2.1c1.2 0 2.1-.3 2.8-.9.8-.7 1.2-1.7 1.2-3.1s-.4-2.5-1.2-3.2c-.7-.8-1.7-1.4-2.8-1.4zm.2 7h-.2v-5.4h.1c1.5 0 2.3.9 2.3 2.7 0 1.9-.8 2.7-2.2 2.7zM30.4 16.3c0 2.6 1.4 4.2 3.5 4.2 1.3 0 2.3-.6 2.9-1.5l-1.1-.7c-.4.6-1 .9-1.7.9-1.2 0-2-1-2.1-2.5h5.1v-.5c0-2.8-1.5-4.5-3.7-4.5-2.2 0-3.9 1.7-3.9 4.6zm3.5-3.1c1.1 0 1.8.9 1.9 2.3h-3.8c.2-1.4 1-2.3 1.9-2.3zM40.5 20.7l-2.4-7.7h-1.7l3.5 9.7c-.2.6-.5.8-1 .8h-.3v1.4h.5c1.2 0 1.8-.5 2.3-1.8L45.5 13h-1.7l-3.3 7.7z"
            fill="#fff"
          />
        </svg>
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
      return 'Card';
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
