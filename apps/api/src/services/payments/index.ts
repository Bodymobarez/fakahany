import { PaymentMethod } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { codProvider } from './cod';
import { stripeProvider } from './stripe';
import {
  applePayProvider,
  giftVoucherProvider,
  googlePayProvider,
  moyasarProvider,
  networkProvider,
  payfortProvider,
  paytabsProvider,
  rewardPointsProvider,
  tabbyProvider,
  tamaraProvider,
  walletProvider,
} from './stubs';
import type { PaymentProvider } from './types';

const providers: Record<PaymentMethod, PaymentProvider> = {
  [PaymentMethod.COD]: codProvider,
  [PaymentMethod.STRIPE]: stripeProvider,
  [PaymentMethod.TABBY]: tabbyProvider,
  [PaymentMethod.TAMARA]: tamaraProvider,
  [PaymentMethod.PAYTABS]: paytabsProvider,
  [PaymentMethod.NETWORK_INTERNATIONAL]: networkProvider,
  [PaymentMethod.PAYFORT]: payfortProvider,
  [PaymentMethod.MOYASAR]: moyasarProvider,
  [PaymentMethod.APPLE_PAY]: applePayProvider,
  [PaymentMethod.GOOGLE_PAY]: googlePayProvider,
  [PaymentMethod.WALLET]: walletProvider,
  [PaymentMethod.GIFT_VOUCHER]: giftVoucherProvider,
  [PaymentMethod.REWARD_POINTS]: rewardPointsProvider,
};

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  const provider = providers[method];
  if (!provider) {
    throw new AppError(400, `Unsupported payment method: ${method}`, 'UNSUPPORTED_PAYMENT');
  }
  return provider;
}

export * from './types';
