import { api } from './api';

let idsCache: Promise<Set<string>> | null = null;

export function getWishlistIdSet(force = false): Promise<Set<string>> {
  if (!idsCache || force) {
    idsCache = api
      .get<{ productIds: string[] }>('/api/wishlist/ids')
      .then(({ data }) => new Set(data.productIds || []))
      .catch(() => new Set<string>());
  }
  return idsCache;
}

export function invalidateWishlistIds() {
  idsCache = null;
}

export async function addToWishlist(productId: string) {
  await api.post('/api/wishlist', { productId });
  invalidateWishlistIds();
}

export async function removeFromWishlist(productId: string) {
  await api.delete(`/api/wishlist/${productId}`);
  invalidateWishlistIds();
}
