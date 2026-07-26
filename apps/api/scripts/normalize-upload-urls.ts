/**
 * Convert absolute localhost upload URLs in the DB to relative /uploads/... paths.
 * Run: npx tsx scripts/normalize-upload-urls.ts
 */
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const prisma = new PrismaClient();

function toRelative(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/^(?:https?:\/\/[^/]+)?(\/uploads\/.+)$/i);
  if (m) return m[1]!;
  if (/localhost|127\.0\.0\.1/i.test(url) && url.includes('/uploads/')) {
    const idx = url.indexOf('/uploads/');
    return url.slice(idx);
  }
  return url;
}

async function normalizeTable(
  label: string,
  rows: Array<{ id: string; value: string | null | undefined }>,
  update: (id: string, next: string) => Promise<unknown>,
) {
  let n = 0;
  for (const row of rows) {
    const next = toRelative(row.value);
    if (next && next !== row.value) {
      await update(row.id, next);
      n += 1;
    }
  }
  console.log(`  ${label}: ${n}`);
  return n;
}

async function main() {
  let updated = 0;

  const categories = await prisma.category.findMany({ select: { id: true, imageUrl: true } });
  updated += await normalizeTable(
    'categories',
    categories.map((r) => ({ id: r.id, value: r.imageUrl })),
    (id, imageUrl) => prisma.category.update({ where: { id }, data: { imageUrl } }),
  );

  const images = await prisma.productImage.findMany({ select: { id: true, url: true } });
  updated += await normalizeTable(
    'productImages',
    images.map((r) => ({ id: r.id, value: r.url })),
    (id, url) => prisma.productImage.update({ where: { id }, data: { url } }),
  );

  try {
    const recipes = await prisma.recipe.findMany({ select: { id: true, imageUrl: true } });
    updated += await normalizeTable(
      'recipes',
      recipes.map((r) => ({ id: r.id, value: r.imageUrl })),
      (id, imageUrl) => prisma.recipe.update({ where: { id }, data: { imageUrl } }),
    );
  } catch (err) {
    console.log(`  recipes: skipped (${err instanceof Error ? err.message : 'n/a'})`);
  }

  try {
    const banners = await prisma.banner.findMany({ select: { id: true, imageUrl: true } });
    updated += await normalizeTable(
      'banners',
      banners.map((r) => ({ id: r.id, value: r.imageUrl })),
      (id, imageUrl) => prisma.banner.update({ where: { id }, data: { imageUrl } }),
    );
  } catch (err) {
    console.log(`  banners: skipped (${err instanceof Error ? err.message : 'n/a'})`);
  }

  console.log(`Normalized ${updated} media URL(s) to relative /uploads paths`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
