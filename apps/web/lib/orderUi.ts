export const ORDER_TRACK_STEPS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PROCESSING', label: 'Prepairing' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
] as const;

/** Map DB status → tracker step index (0–4). Returns -1 for terminal/error states. */
export function orderTrackStepIndex(status: string): number {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'ACCEPTED':
      return 1;
    case 'PREPARING':
    case 'PACKED':
      return 2;
    case 'OUT_FOR_DELIVERY':
      return 3;
    case 'DELIVERED':
      return 4;
    default:
      return -1;
  }
}

export function orderStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'ACCEPTED':
      return 'Confirmed';
    case 'PREPARING':
    case 'PACKED':
      return 'Prepairing';
    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REFUNDED':
      return 'Refunded';
    case 'RETURNED':
      return 'Returned';
    case 'FAILED_PAYMENT':
      return 'Payment failed';
    default:
      return status.replaceAll('_', ' ');
  }
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case 'COD':
      return 'Cash on Delivery';
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
    case 'GIFT_VOUCHER':
      return 'Gift voucher';
    case 'REWARD_POINTS':
      return 'Reward points';
    default:
      return method.replaceAll('_', ' ');
  }
}

export function formatPlacedAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `Placed on ${date} • ${time}`;
}

/** Line qty like "x1.250 kg" or "x2". */
export function formatOrderLineQty(input: {
  quantity: number;
  weight?: number | string | null;
  unit?: string | null;
  variantWeight?: number | string | null;
}): string {
  const unitWeightRaw = input.variantWeight ?? input.weight;
  const unitWeight =
    unitWeightRaw != null && unitWeightRaw !== '' ? Number(unitWeightRaw) : NaN;
  const unitRaw = (input.unit || '').trim().toLowerCase();
  const unitLabel = unitRaw === 'g' ? 'gr' : unitRaw;

  if (Number.isFinite(unitWeight) && unitWeight > 0 && unitLabel) {
    const total = unitWeight * input.quantity;
    const amount =
      unitRaw === 'kg'
        ? total.toFixed(3)
        : total % 1 === 0
          ? String(total)
          : String(Number(total.toFixed(3)));
    return `x${amount} ${unitLabel}`;
  }

  return `x${input.quantity}`;
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-800';
    case 'OUT_FOR_DELIVERY':
      return 'bg-sky-100 text-sky-800';
    case 'PENDING':
    case 'ACCEPTED':
    case 'PREPARING':
    case 'PACKED':
      return 'bg-amber-100 text-amber-900';
    case 'CANCELLED':
    case 'FAILED_PAYMENT':
      return 'bg-red-100 text-red-800';
    case 'REFUNDED':
    case 'RETURNED':
      return 'bg-orange-100 text-orange-900';
    default:
      return 'bg-leaf-100 text-leaf-800';
  }
}
