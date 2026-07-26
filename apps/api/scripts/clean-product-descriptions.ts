/**
 * Strip HTML / ChatGPT markup from product descriptionEn / descriptionAr.
 * Run: npx tsx scripts/clean-product-descriptions.ts
 */
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { cleanProductDescription } from '../src/lib/cleanDescription';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, slug: true, descriptionEn: true, descriptionAr: true },
  });

  let updated = 0;
  for (const p of products) {
    const descriptionEn = cleanProductDescription(p.descriptionEn);
    const descriptionAr = cleanProductDescription(p.descriptionAr);
    if (descriptionEn === p.descriptionEn && descriptionAr === p.descriptionAr) continue;
    await prisma.product.update({
      where: { id: p.id },
      data: { descriptionEn, descriptionAr },
    });
    updated += 1;
    console.log(`cleaned ${p.slug}`);
  }
  console.log(`Updated ${updated} / ${products.length} products`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
