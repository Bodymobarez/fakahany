export type CustomerOrderItem = {
  id: string;
  productId: string;
  variantId?: string | null;
  nameEn: string;
  nameAr?: string;
  sku: string;
  quantity: number;
  unitPrice: number | string;
  lineTotal: number | string;
  product?: {
    id: string;
    slug?: string;
    soldAs?: string | null;
    weight?: number | string | null;
    unit?: string | null;
    packageSize?: string | null;
    images?: Array<{ url: string }>;
  } | null;
  variant?: {
    id: string;
    name?: string | null;
    weight?: number | string | null;
  } | null;
};

export type CustomerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number | string;
  shipping: number | string;
  tax: number | string;
  discount?: number | string;
  total: number | string;
  paymentMethod: string;
  vatRateSnap?: number | string | null;
  createdAt: string;
  deliveryNotes?: string | null;
  address?: {
    label?: string;
    line1: string;
    line2?: string | null;
    area?: string | null;
    street?: string | null;
    building?: string | null;
    floor?: string | null;
    apartment?: string | null;
    city: string;
    emirate: string;
  } | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  items: CustomerOrderItem[];
  statusHistory?: Array<{ status: string; note?: string | null; createdAt: string }>;
};
