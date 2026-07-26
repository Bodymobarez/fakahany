export const CURRENCY_CODE = 'AED';

/** Formats an amount as "12.50" style with 2 decimals. Does not include currency text. */
export function formatMoneyAmount(amount: number | string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(value)) {
    return '0.00';
  }
  return value.toFixed(2);
}
