import { PaymentMethod, PaymentStatus } from '@prisma/client';
import type { PaymentIntentInput, PaymentIntentResult, PaymentProvider } from './types';

export const codProvider: PaymentProvider = {
  method: PaymentMethod.COD,
  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    return {
      provider: PaymentMethod.COD,
      status: PaymentStatus.PENDING,
      externalId: `cod_${input.orderNumber}`,
      meta: { collectOnDelivery: true, amount: input.amount },
    };
  },
};
