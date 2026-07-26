import type { CatalogProduct } from './api';

export const SAMPLE_PRODUCTS: CatalogProduct[] = [
  {
    id: 'sample-1',
    slug: 'organic-avocado',
    nameEn: 'Organic Hass Avocado',
    nameAr: 'أفوكادو هاس عضوي',
    price: 12.5,
    compareAtPrice: 15,
    imageUrl:
      'https://images.unsplash.com/photo-1523049673857-eb24f48b9c2d?w=600&q=80',
    inStock: true,
    isFeatured: true,
    tags: ['organic', 'best-seller'],
  },
  {
    id: 'sample-2',
    slug: 'strawberry-box',
    nameEn: 'Sweet Strawberries',
    nameAr: 'فراولة حلوة',
    price: 18,
    compareAtPrice: 24,
    imageUrl:
      'https://images.unsplash.com/photo-1464965911861-746a04b4b188?w=600&q=80',
    inStock: true,
    isFeatured: true,
    tags: ['flash', 'seasonal'],
  },
  {
    id: 'sample-3',
    slug: 'baby-spinach',
    nameEn: 'Baby Spinach',
    nameAr: 'سبانخ صغيرة',
    price: 8.75,
    imageUrl:
      'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&q=80',
    inStock: true,
    tags: ['organic', 'veg'],
  },
  {
    id: 'sample-4',
    slug: 'imported-mango',
    nameEn: 'Alphonso Mango',
    nameAr: 'مانجو ألفونسو',
    price: 22,
    imageUrl:
      'https://images.unsplash.com/photo-1553279768-bb40cc8b7c9a?w=600&q=80',
    inStock: true,
    tags: ['imported', 'seasonal'],
  },
  {
    id: 'sample-5',
    slug: 'cherry-tomatoes',
    nameEn: 'Cherry Tomatoes',
    nameAr: 'طماطم كرزية',
    price: 9.5,
    compareAtPrice: 12,
    imageUrl:
      'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600&q=80',
    inStock: true,
    tags: ['offer', 'best-seller'],
  },
  {
    id: 'sample-6',
    slug: 'green-apples',
    nameEn: 'Granny Smith Apples',
    nameAr: 'تفاح غراني سميث',
    price: 14,
    imageUrl:
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&q=80',
    inStock: true,
    tags: ['new', 'fruit'],
  },
  {
    id: 'sample-7',
    slug: 'cucumber',
    nameEn: 'Lebanese Cucumber',
    nameAr: 'خيار لبناني',
    price: 6.25,
    imageUrl:
      'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=600&q=80',
    inStock: true,
    tags: ['veg', 'seasonal'],
  },
  {
    id: 'sample-8',
    slug: 'blueberries',
    nameEn: 'Fresh Blueberries',
    nameAr: 'توت أزرق طازج',
    price: 28,
    compareAtPrice: 34,
    imageUrl:
      'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=600&q=80',
    inStock: true,
    tags: ['imported', 'flash'],
  },
];

export const SAMPLE_CATEGORIES = [
  {
    slug: 'fruits',
    nameEn: 'Fruits',
    nameAr: 'فواكه',
    image:
      'https://images.unsplash.com/photo-1619566636858-adf3ef4644b9?w=400&q=80',
  },
  {
    slug: 'vegetables',
    nameEn: 'Vegetables',
    nameAr: 'خضروات',
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80',
  },
  {
    slug: 'organic',
    nameEn: 'Organic',
    nameAr: 'عضوي',
    image:
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&q=80',
  },
  {
    slug: 'herbs',
    nameEn: 'Herbs',
    nameAr: 'أعشاب',
    image:
      'https://images.unsplash.com/photo-1466692476866-aef1dfb1e735?w=400&q=80',
  },
];

export function filterByTag(tag: string): CatalogProduct[] {
  return SAMPLE_PRODUCTS.filter((p) => p.tags?.includes(tag));
}
