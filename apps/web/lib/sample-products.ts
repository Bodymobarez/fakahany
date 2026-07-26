import type { CatalogProduct } from './api';

const img = (id: string, w = 600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const SAMPLE_PRODUCTS: CatalogProduct[] = [
  {
    id: 'sample-1',
    slug: 'organic-avocado',
    nameEn: 'Organic Hass Avocado',
    nameAr: 'أفوكادو هاس عضوي',
    price: 12.5,
    compareAtPrice: 15,
    imageUrl: img('photo-1622206151226-18ca2c9ab4a1'),
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
    imageUrl: img('photo-1601004890684-d8cbf643f5f2'),
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
    imageUrl: img('photo-1576045057995-568f588f82fb'),
    inStock: true,
    tags: ['organic', 'veg'],
  },
  {
    id: 'sample-4',
    slug: 'imported-mango',
    nameEn: 'Alphonso Mango',
    nameAr: 'مانجو ألفونسو',
    price: 22,
    imageUrl: img('photo-1600271886742-f049cd451bba'),
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
    imageUrl: img('photo-1592924357228-91a4daadcfea'),
    inStock: true,
    tags: ['offer', 'best-seller'],
  },
  {
    id: 'sample-6',
    slug: 'green-apples',
    nameEn: 'Granny Smith Apples',
    nameAr: 'تفاح غراني سميث',
    price: 14,
    imageUrl: img('photo-1560806887-1e4cd0b6cbd6'),
    inStock: true,
    tags: ['new', 'fruit'],
  },
  {
    id: 'sample-7',
    slug: 'cucumber',
    nameEn: 'Lebanese Cucumber',
    nameAr: 'خيار لبناني',
    price: 6.25,
    imageUrl: img('photo-1449300079323-02e209d9d3a6'),
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
    imageUrl: img('photo-1498557850523-fd3d118b962e'),
    inStock: true,
    tags: ['imported', 'flash'],
  },
];

export const SAMPLE_CATEGORIES = [
  {
    slug: 'fruits',
    nameEn: 'Fruits',
    nameAr: 'فواكه',
    image: img('photo-1610832958506-aa56368176cf', 400),
  },
  {
    slug: 'vegetables',
    nameEn: 'Vegetables',
    nameAr: 'خضروات',
    image: img('photo-1540420773420-3366772f4999', 400),
  },
  {
    slug: 'organic',
    nameEn: 'Organic',
    nameAr: 'عضوي',
    image: img('photo-1488459716781-31db52582fe9', 400),
  },
  {
    slug: 'herbs',
    nameEn: 'Herbs',
    nameAr: 'أعشاب',
    image: img('photo-1563565375-f3fdfdbefa83', 400),
  },
];

export function filterByTag(tag: string): CatalogProduct[] {
  return SAMPLE_PRODUCTS.filter((p) => p.tags?.includes(tag));
}
