export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  PACKED = 'PACKED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  RETURNED = 'RETURNED',
  FAILED_PAYMENT = 'FAILED_PAYMENT',
}

export enum ProductType {
  SIMPLE = 'SIMPLE',
  VARIABLE = 'VARIABLE',
  BUNDLE = 'BUNDLE',
  COMBO = 'COMBO',
  SEASONAL = 'SEASONAL',
  PREORDER = 'PREORDER',
}

export enum SoldAs {
  BOX = 'BOX',
  PIECE = 'PIECE',
}

/** Allowed weight/measure units for catalog products. */
export const WEIGHT_UNITS = [
  { slug: 'g', name: 'Gram', symbol: 'g' },
  { slug: 'kg', name: 'Kilogram', symbol: 'kg' },
  { slug: 'bunch', name: 'Bunch', symbol: 'bunch' },
  { slug: 'pack', name: 'Pack', symbol: 'pack' },
] as const;

export enum PaymentMethod {
  COD = 'COD',
  STRIPE = 'STRIPE',
  TABBY = 'TABBY',
  TAMARA = 'TAMARA',
  PAYTABS = 'PAYTABS',
  NETWORK_INTERNATIONAL = 'NETWORK_INTERNATIONAL',
  PAYFORT = 'PAYFORT',
  MOYASAR = 'MOYASAR',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
  WALLET = 'WALLET',
  GIFT_VOUCHER = 'GIFT_VOUCHER',
  REWARD_POINTS = 'REWARD_POINTS',
}

export enum DeliveryType {
  SAME_DAY = 'SAME_DAY',
  NEXT_DAY = 'NEXT_DAY',
  EXPRESS = 'EXPRESS',
  SCHEDULED = 'SCHEDULED',
  PICKUP = 'PICKUP',
}

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER',
  STAFF = 'STAFF',
}

export enum StockMovementType {
  IN = 'IN',
  OUT = 'OUT',
  DAMAGED = 'DAMAGED',
  EXPIRED = 'EXPIRED',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  CYCLE_COUNT = 'CYCLE_COUNT',
  RECEIVING = 'RECEIVING',
}
