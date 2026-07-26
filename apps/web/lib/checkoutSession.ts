export type PendingCardPayment = {
  paymentId: string;
  clientSecret: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  items: Array<{ name: string; quantity: number; lineTotal: number }>;
  subtotal: number;
  vatAmount: number;
  deliveryFee: number;
  tipAmount: number;
  discountAmount: number;
};

const KEY = 'fv_pending_card_payment';

export function savePendingCardPayment(payload: PendingCardPayment) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(KEY, JSON.stringify(payload));
}

export function loadPendingCardPayment(): PendingCardPayment | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingCardPayment;
  } catch {
    return null;
  }
}

export function clearPendingCardPayment() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(KEY);
}
