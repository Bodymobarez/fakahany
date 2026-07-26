import { api, type ApiCart } from './api';
import { getSessionId } from './session';

export async function fetchCart(opts?: {
  addressId?: string;
  emirate?: string;
  lat?: number;
  lng?: number;
}): Promise<ApiCart> {
  const { data } = await api.get<{ cart: ApiCart }>('/api/cart', {
    headers: { 'X-Session-Id': getSessionId() },
    params: {
      addressId: opts?.addressId,
      emirate: opts?.emirate,
      lat: opts?.lat,
      lng: opts?.lng,
    },
  });
  return data.cart;
}

export async function addToCartApi(
  productId: string,
  quantity = 1,
  variantId?: string | null,
): Promise<ApiCart> {
  const { data } = await api.post<{ cart: ApiCart }>(
    '/api/cart/items',
    {
      productId,
      quantity,
      variantId: variantId || null,
      sessionId: getSessionId(),
    },
    { headers: { 'X-Session-Id': getSessionId() } },
  );
  return data.cart;
}

export async function updateCartItemApi(itemId: string, quantity: number): Promise<ApiCart> {
  const { data } = await api.patch<{ cart: ApiCart }>(
    `/api/cart/items/${itemId}`,
    { quantity },
    { headers: { 'X-Session-Id': getSessionId() } },
  );
  return data.cart;
}

export async function removeCartItemApi(itemId: string): Promise<ApiCart> {
  const { data } = await api.delete<{ cart: ApiCart }>(`/api/cart/items/${itemId}`, {
    headers: { 'X-Session-Id': getSessionId() },
  });
  return data.cart;
}

export async function mergeGuestCart(): Promise<ApiCart | null> {
  const sessionId = getSessionId();
  if (!sessionId) return null;
  const { data } = await api.post<{ cart: ApiCart }>('/api/cart/merge', { sessionId });
  return data.cart;
}

export async function applyCouponApi(code: string): Promise<ApiCart> {
  const { data } = await api.post<{ cart: ApiCart }>('/api/cart/coupon', { code });
  return data.cart;
}

export async function removeCouponApi(): Promise<ApiCart> {
  const { data } = await api.delete<{ cart: ApiCart }>('/api/cart/coupon');
  return data.cart;
}

export async function clearCartApi(): Promise<ApiCart> {
  const { data } = await api.delete<{ cart: ApiCart }>('/api/cart', {
    headers: { 'X-Session-Id': getSessionId() },
  });
  return data.cart;
}
