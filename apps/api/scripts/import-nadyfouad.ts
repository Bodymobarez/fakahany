/**
 * Import categories + products from https://nadyfouad.com/ (GroFresh public API).
 * Downloads images and upscales the longest edge toward 8K (7680px) with sharp.
 *
 * Usage (from apps/api):
 *   pnpm import:nadyfouad
 */
import path from 'path';
import fs from 'fs/promises';
import { createHash } from 'crypto';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { PrismaClient, ProductType, SoldAs } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API = 'https://nadyfouad.com/demo.nadyfouad.net/api/v1';
const PRODUCT_IMG =
  'https://nadyfouad.com/demo.nadyfouad.net/storage/app/public/product';
const CATEGORY_IMG =
  'https://nadyfouad.com/demo.nadyfouad.net/storage/app/public/category';
const PUBLIC_API = (process.env.PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
/**
 * Longest-edge target for refined images.
 * Source catalog photos are ~1600px; Lanczos upscales toward UHD.
 * Default 4096 (4K-class) keeps quality high without multi‑GB 8K files.
 * Set IMPORT_IMAGE_MAX_EDGE=7680 for literal 8K-width exports.
 */
const IMAGE_MAX_EDGE = Number(process.env.IMPORT_IMAGE_MAX_EDGE || 4096);
const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

const prisma = new PrismaClient();

type NfCategory = {
  id: number;
  name: string;
  image?: string | null;
  priority?: number;
  status?: number;
};

type NfProduct = {
  id: number;
  name: string;
  description?: string | null;
  image?: string[];
  price: number;
  discount?: number;
  discount_type?: string;
  unit?: string;
  weight?: number;
  capacity?: number;
  total_stock?: number;
  status?: number;
  is_featured?: number;
  category_ids?: Array<{ id: string; position?: number }>;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '');
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return (await res.json()) as T;
}

async function downloadBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function refineToHiRes(buffer: Buffer, basename: string): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const meta = await sharp(buffer).rotate().metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const longEdge = Math.max(w, h);
  const scale = longEdge < IMAGE_MAX_EDGE ? IMAGE_MAX_EDGE / longEdge : 1;
  const targetW = Math.round(w * scale);
  const targetH = Math.round(h * scale);

  const hash = createHash('sha1').update(basename).digest('hex').slice(0, 12);
  const filename = `nf-${hash}.webp`;
  const abs = path.join(UPLOAD_DIR, filename);

  // Cap pixels to avoid pathological memory use on very tall images
  const maxPixels = IMAGE_MAX_EDGE * IMAGE_MAX_EDGE;
  let outW = targetW;
  let outH = targetH;
  if (outW * outH > maxPixels) {
    const r = Math.sqrt(maxPixels / (outW * outH));
    outW = Math.max(1, Math.round(outW * r));
    outH = Math.max(1, Math.round(outH * r));
  }

  await sharp(buffer, { limitInputPixels: false })
    .rotate()
    .resize({
      width: outW,
      height: outH,
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .webp({ quality: 85, effort: 2 })
    .toFile(abs);

  return `${PUBLIC_API}/uploads/${filename}`;
}

function unitNormalize(unit?: string | null): string {
  const u = (unit || 'kg').toLowerCase().trim();
  if (u === 'gm' || u === 'gram' || u === 'grams') return 'g';
  if (u === 'kilogram' || u === 'kgs') return 'kg';
  return u || 'kg';
}

function pricing(p: NfProduct): { basePrice: number; compareAtPrice: number | null } {
  const list = Number(p.price) || 0;
  const disc = Number(p.discount) || 0;
  if (disc <= 0) return { basePrice: list, compareAtPrice: null };
  if ((p.discount_type || 'percent') === 'percent') {
    const sale = Math.round(list * (1 - disc / 100) * 100) / 100;
    return { basePrice: sale, compareAtPrice: list };
  }
  const sale = Math.max(0, Math.round((list - disc) * 100) / 100);
  return { basePrice: sale, compareAtPrice: list };
}

async function loadAllProducts(): Promise<NfProduct[]> {
  const first = await fetchJson<{
    total_size: number;
    products: NfProduct[];
  }>(`${API}/products/latest?limit=100&offset=1`);
  const products = [...(first.products || [])];
  const total = Number(first.total_size) || products.length;
  let offset = 2;
  while (products.length < total) {
    const page = await fetchJson<{ products: NfProduct[] }>(
      `${API}/products/latest?limit=100&offset=${offset}`,
    );
    if (!page.products?.length) break;
    products.push(...page.products);
    offset += 1;
  }
  return products;
}

async function main() {
  console.log('Fetching Nadi Fouad catalog…');
  const categories = await fetchJson<NfCategory[]>(`${API}/categories`);
  const products = await loadAllProducts();
  console.log(`Categories: ${categories.length}, Products: ${products.length}`);
  console.log(`Image refine target: ${IMAGE_MAX_EDGE}px longest edge → ${UPLOAD_DIR}`);

  const brand = await prisma.brand.upsert({
    where: { slug: 'nadi-fouad' },
    update: { name: 'Nadi Fouad' },
    create: { name: 'Nadi Fouad', slug: 'nadi-fouad' },
  });

  const warehouse =
    (await prisma.warehouse.findFirst({ where: { isDefault: true } })) ||
    (await prisma.warehouse.findFirst()) ||
    (await prisma.warehouse.create({
      data: { name: 'Main Warehouse', code: 'MAIN', isDefault: true },
    }));

  const catIdMap = new Map<string, string>();

  for (const [i, cat] of categories.entries()) {
    const slugBase = slugify(cat.name) || `category-${cat.id}`;
    const slug = `${slugBase}`;
    let imageUrl: string | null = null;
    if (cat.image) {
      const buf = await downloadBuffer(`${CATEGORY_IMG}/${cat.image}`);
      if (buf) {
        try {
          imageUrl = await refineToHiRes(buf, `cat-${cat.id}-${cat.image}`);
        } catch (e) {
          console.warn(`Category image failed ${cat.name}:`, e);
        }
      }
    }

    const row = await prisma.category.upsert({
      where: { slug },
      update: {
        nameEn: cat.name,
        nameAr: cat.name,
        sortOrder: cat.priority ?? i + 1,
        isActive: cat.status !== 0,
        ...(imageUrl ? { imageUrl } : {}),
      },
      create: {
        nameEn: cat.name,
        nameAr: cat.name,
        slug,
        sortOrder: cat.priority ?? i + 1,
        isActive: cat.status !== 0,
        imageUrl,
      },
    });
    catIdMap.set(String(cat.id), row.id);
    console.log(`✓ category ${cat.name}`);
  }

  // Catch orphan remote category ids (e.g. 17)
  const orphan = new Set<string>();
  for (const p of products) {
    for (const c of p.category_ids || []) {
      if (!catIdMap.has(String(c.id))) orphan.add(String(c.id));
    }
  }
  if (orphan.size) {
    const other = await prisma.category.upsert({
      where: { slug: 'imported-other' },
      update: { nameEn: 'Other', nameAr: 'أخرى', isActive: true },
      create: {
        nameEn: 'Other',
        nameAr: 'أخرى',
        slug: 'imported-other',
        sortOrder: 99,
        isActive: true,
      },
    });
    for (const id of orphan) catIdMap.set(id, other.id);
    console.log(`✓ mapped orphan categories ${[...orphan].join(', ')} → Other`);
  }

  let ok = 0;
  let fail = 0;

  for (const [index, p] of products.entries()) {
    try {
      if (p.status === 0) continue;
      console.log(`[${index + 1}/${products.length}] ${p.name}`);
      const slug = `${slugify(p.name) || 'product'}-${p.id}`;
      const sku = `NF-${p.id}`;
      const { basePrice, compareAtPrice } = pricing(p);
      const unit = unitNormalize(p.unit);
      const weightRaw = Number(p.capacity) > 0 ? Number(p.capacity) : Number(p.weight) || 1;
      const soldAs =
        /\bbox\b/i.test(p.name) || weightRaw >= 2 ? SoldAs.BOX : SoldAs.PIECE;
      const stockQty = Math.min(Math.max(0, Number(p.total_stock) || 0), 5000);
      const remoteCats = (p.category_ids || []).map((c) => catIdMap.get(String(c.id))).filter(Boolean) as string[];

      const imageUrls: string[] = [];
      for (const [idx, img] of (p.image || []).entries()) {
        const buf = await downloadBuffer(`${PRODUCT_IMG}/${img}`);
        if (!buf) continue;
        try {
          imageUrls.push(await refineToHiRes(buf, `prod-${p.id}-${idx}-${img}`));
        } catch (e) {
          console.warn(`  image fail ${p.name} #${idx}`, e);
        }
      }

      const product = await prisma.product.upsert({
        where: { slug },
        update: {
          nameEn: p.name,
          nameAr: p.name,
          descriptionEn: p.description || p.name,
          descriptionAr: p.description || p.name,
          basePrice,
          compareAtPrice,
          stockQty,
          soldAs,
          weight: weightRaw,
          unit,
          type: ProductType.SIMPLE,
          brandId: brand.id,
          isFeatured: Boolean(p.is_featured),
          isActive: true,
          tags: ['nadi-fouad', 'imported'],
          sku,
        },
        create: {
          nameEn: p.name,
          nameAr: p.name,
          slug,
          sku,
          descriptionEn: p.description || p.name,
          descriptionAr: p.description || p.name,
          basePrice,
          compareAtPrice,
          stockQty,
          soldAs,
          weight: weightRaw,
          unit,
          type: ProductType.SIMPLE,
          brandId: brand.id,
          isFeatured: Boolean(p.is_featured),
          isActive: true,
          tags: ['nadi-fouad', 'imported'],
        },
      });

      // Refresh images
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      if (imageUrls.length) {
        await prisma.productImage.createMany({
          data: imageUrls.map((url, sortOrder) => ({
            productId: product.id,
            url,
            sortOrder,
            isPrimary: sortOrder === 0,
          })),
        });
      }

      await prisma.productCategory.deleteMany({ where: { productId: product.id } });
      if (remoteCats.length) {
        await prisma.productCategory.createMany({
          data: remoteCats.map((categoryId) => ({ productId: product.id, categoryId })),
          skipDuplicates: true,
        });
      }

      const existingLevel = await prisma.stockLevel.findFirst({
        where: { warehouseId: warehouse.id, productId: product.id, productVariantId: null },
      });
      if (existingLevel) {
        await prisma.stockLevel.update({
          where: { id: existingLevel.id },
          data: { qty: stockQty, reorderLevel: 10 },
        });
      } else {
        await prisma.stockLevel.create({
          data: {
            warehouseId: warehouse.id,
            productId: product.id,
            qty: stockQty,
            reorderLevel: 10,
          },
        });
      }

      ok += 1;
      if (ok % 10 === 0) console.log(`… imported ${ok}/${products.length}`);
    } catch (e) {
      fail += 1;
      console.error(`✗ product ${p.id} ${p.name}`, e);
    }
  }

  console.log(`Done. Imported/updated ${ok} products (${fail} failed).`);
  console.log(`Browse shop at http://localhost:3000 — images served from ${PUBLIC_API}/uploads`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
