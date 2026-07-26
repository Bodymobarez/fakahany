import type { PaymentMethod, PaymentStatus } from '@prisma/client';

export interface PaymentIntentInput {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail?: string | null;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  provider: PaymentMethod;
  status: PaymentStatus;
  externalId?: string;
  clientSecret?: string;
  redirectUrl?: string;
  meta?: Record<string, unknown>;
}

export interface PaymentProvider {
  method: PaymentMethod;
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  capture?(externalId: string): Promise<PaymentIntentResult>;
  refund?(externalId: string, amount?: number): Promise<PaymentIntentResult>;
}
