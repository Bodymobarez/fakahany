import axios from 'axios';
import { clearTokens, getAccessToken, getSessionId } from './session';

const baseURL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const sessionId = getSessionId();
    if (sessionId) {
      config.headers['X-Session-Id'] = sessionId;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      // Token invalid — clear so UI can re-auth; leave guest session intact
      clearTokens();
    }
    return Promise.reject(error);
  },
);

export type CatalogProduct = {
  id: string;
  slug: string;
  nameEn?: string;
  nameAr?: string;
  name?: string;
  price?: number | string;
  basePrice?: number | string;
  compareAtPrice?: number | string | null;
  imageUrl?: string | null;
  images?: Array<{ url: string; isPrimary?: boolean }>;
  inStock?: boolean;
  stockQty?: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNew?: boolean;
  isOrganic?: boolean;
  isImported?: boolean;
  isSeasonal?: boolean;
  tags?: string[];
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  nutritionFacts?: Record<string, unknown> | null;
  nutritionJson?: Record<string, unknown> | null;
  soldAs?: string | null;
  unit?: string | null;
  weight?: number | string | null;
  packageSize?: string | null;
  variants?: Array<{
    id: string;
    name: string;
    sku: string;
    price: number | string;
    stockQty?: number;
    isActive?: boolean;
  }>;
  vendor?: { id: string; slug: string; name: string } | null;
  relatedProducts?: CatalogProduct[];
  relationsFrom?: Array<{ related: CatalogProduct }>;
};

export function productDisplayName(
  product: CatalogProduct,
  locale: string,
): string {
  if (locale === 'ar') {
    return product.nameAr || product.nameEn || product.name || product.slug;
  }
  return product.nameEn || product.nameAr || product.name || product.slug;
}

export function productImage(product: CatalogProduct): string {
  const raw =
    product.imageUrl ||
    (product.images?.find((i) => i.isPrimary) ?? product.images?.[0])?.url ||
    '';
  if (!raw) {
    return 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&q=80';
  }
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
    return raw;
  }
  if (raw.startsWith('/uploads/')) {
    return `${baseURL}${raw}`;
  }
  return raw;
}

export function productPrice(product: CatalogProduct): number {
  const value = Number(product.basePrice ?? product.price);
  return Number.isFinite(value) ? value : 0;
}

export type ApiUser = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: string;
};

export function displayName(user: ApiUser): string {
  return `${user.firstName} ${user.lastName}`.trim() || user.email || 'Customer';
}

export type ApiCart = {
  id: string;
  items: Array<{
    id: string;
    productId: string;
    variantId?: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    imageUrl?: string | null;
  }>;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  vatAmount: number;
  total: number;
  coupon: { code: string; type: string; value: number } | null;
};
