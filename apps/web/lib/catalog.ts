import {
  api,
  type CatalogProduct,
  productDisplayName,
  productImage,
  productPrice,
} from './api';
import { SAMPLE_PRODUCTS, filterByTag } from './sample-products';

export { productDisplayName, productImage, productPrice };

const noStore = {
  headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  params: { _ts: Date.now() },
};

export async function fetchFeaturedProducts(): Promise<CatalogProduct[]> {
  try {
    const { data } = await api.get<{ products: CatalogProduct[] }>(
      '/api/catalog/products/featured',
      {
        ...noStore,
        params: { ...noStore.params },
      },
    );
    if (Array.isArray(data.products)) {
      return data.products;
    }
  } catch {
    // API unavailable — fall back to samples
  }
  return SAMPLE_PRODUCTS.filter((p) => p.isFeatured);
}

export async function fetchProducts(params?: {
  q?: string;
  category?: string;
  brand?: string;
  page?: number;
}): Promise<CatalogProduct[]> {
  try {
    const { data } = await api.get<{ products: CatalogProduct[] }>(
      '/api/catalog/products',
      {
        ...noStore,
        params: { ...params, _ts: Date.now() },
      },
    );
    if (Array.isArray(data.products)) {
      return data.products;
    }
  } catch {
    // fall through to samples only if API is down
  }

  let items = SAMPLE_PRODUCTS;
  if (params?.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.nameEn?.toLowerCase().includes(q) ||
        p.nameAr?.includes(params.q!) ||
        p.slug.includes(q),
    );
  }
  if (params?.category) {
    items = items.filter((p) => p.tags?.includes(params.category!));
  }
  return items;
}

export async function fetchProductBySlug(
  slug: string,
): Promise<CatalogProduct | null> {
  try {
    const { data } = await api.get<{ product: CatalogProduct }>(
      `/api/catalog/products/${slug}`,
      {
        ...noStore,
        params: { _ts: Date.now() },
      },
    );
    if (data.product) return data.product;
  } catch {
    // fall through
  }
  return SAMPLE_PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export function productsForSection(
  all: CatalogProduct[],
  tag: string,
): CatalogProduct[] {
  const byFlag = all.filter((p) => {
    switch (tag) {
      case 'best-seller':
        return p.isBestSeller || p.tags?.includes('best-seller');
      case 'new':
        return p.isNew || p.tags?.includes('new');
      case 'organic':
        return p.isOrganic || p.tags?.includes('organic');
      case 'imported':
        return p.isImported || p.tags?.includes('imported');
      case 'seasonal':
        return p.isSeasonal || p.tags?.includes('seasonal') || p.tags?.includes('mango');
      case 'offer':
      case 'flash':
        return Boolean(p.compareAtPrice) || p.tags?.includes(tag);
      case 'veg':
        return p.tags?.some((t) => ['veg', 'spinach', 'tomato', 'salad'].includes(t));
      default:
        return p.tags?.includes(tag);
    }
  });
  if (byFlag.length > 0) return byFlag;
  const tagged = all.filter((p) => p.tags?.includes(tag));
  if (tagged.length > 0) return tagged;
  return filterByTag(tag);
}
