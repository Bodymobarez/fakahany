import type {
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  ProductType,
} from './enums';

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  type: ProductType;
  price: number;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  inStock: boolean;
}

export interface CartItem {
  productId: string;
  variantId?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl?: string | null;
}

export interface CartSummary {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  vatAmount: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  deliveryType: DeliveryType;
  itemCount: number;
  subtotal: number;
  vatAmount: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}
