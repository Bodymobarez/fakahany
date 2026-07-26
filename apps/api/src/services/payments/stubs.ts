import { PaymentMethod, PaymentStatus } from '@prisma/client';
import type { PaymentIntentInput, PaymentIntentResult, PaymentProvider } from './types';

function stubProvider(method: PaymentMethod): PaymentProvider {
  return {
    method,
    async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
      return {
        provider: method,
        status: PaymentStatus.PENDING,
        externalId: `${method.toLowerCase()}_stub_${input.orderId}`,
        // Client replaces with paymentId after checkout; WEB_URL is the storefront.
        redirectUrl: `${process.env.WEB_URL || 'http://localhost:3000'}/en/checkout/bnpl?method=${method}&orderId=${input.orderId}`,
        meta: { stub: true, amount: input.amount, provider: method },

      };
    },
  };
}

export const tabbyProvider = stubProvider(PaymentMethod.TABBY);
export const tamaraProvider = stubProvider(PaymentMethod.TAMARA);
export const paytabsProvider = stubProvider(PaymentMethod.PAYTABS);
export const networkProvider = stubProvider(PaymentMethod.NETWORK_INTERNATIONAL);
export const payfortProvider = stubProvider(PaymentMethod.PAYFORT);
export const moyasarProvider = stubProvider(PaymentMethod.MOYASAR);
export const applePayProvider = stubProvider(PaymentMethod.APPLE_PAY);
export const googlePayProvider = stubProvider(PaymentMethod.GOOGLE_PAY);
export const walletProvider = stubProvider(PaymentMethod.WALLET);
export const giftVoucherProvider = stubProvider(PaymentMethod.GIFT_VOUCHER);
export const rewardPointsProvider = stubProvider(PaymentMethod.REWARD_POINTS);
