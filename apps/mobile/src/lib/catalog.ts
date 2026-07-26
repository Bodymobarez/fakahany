import { apiFetch } from './api';
import { API_URL } from './api';

export type Product = {
  id: string;
  slug: string;
  nameEn: string;
  basePrice: number | string;
  soldAs?: string | null;
  weight?: number | string | null;
  unit?: string | null;
  packageSize?: string | null;
  images?: Array<{ url: string }>;
};

export type Category = { slug: string; nameEn: string; imageUrl?: string | null };

export type Banner = {
  id: string;
  titleEn: string;
  imageUrl: string;
  linkUrl?: string | null;
};

export type FlashItem = {
  salePrice: number | string;
  product: Product;
};

export function mediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function fetchProducts(opts?: { q?: string; category?: string }) {
  const params = new URLSearchParams();
  if (opts?.q?.trim()) params.set('q', opts.q.trim());
  if (opts?.category) params.set('category', opts.category);
  const qs = params.toString();
  const data = await apiFetch(`/api/catalog/products${qs ? `?${qs}` : ''}`);
  return (data.products || []) as Product[];
}

export async function fetchCategories() {
  const data = await apiFetch('/api/catalog/categories');
  return (data.categories || []) as Category[];
}

export async function fetchBanners() {
  try {
    const data = await apiFetch('/api/content/banners');
    return (data.banners || []) as Banner[];
  } catch {
    return [] as Banner[];
  }
}

export async function fetchFlashSale() {
  try {
    const data = await apiFetch('/api/content/flash-sales');
    const sale = (data.sales || [])[0];
    return {
      name: (sale?.nameEn || '') as string,
      items: (sale?.items || []) as FlashItem[],
    };
  } catch {
    return { name: '', items: [] as FlashItem[] };
  }
}

export async function fetchRecommendations() {
  try {
    const data = await apiFetch('/api/expansion/ai/recommendations');
    return (data.products || []) as Product[];
  } catch {
    return [] as Product[];
  }
}

export async function fetchCmsPage(slug: string) {
  const data = await apiFetch(`/api/content/pages/${slug}`);
  return data.page as {
    slug: string;
    titleEn: string;
    titleAr?: string;
    bodyEn: string;
    bodyAr?: string;
  };
}
