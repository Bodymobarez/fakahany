import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const prisma = new PrismaClient();

async function main() {
  const url = 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80';
  const images = await prisma.productImage.updateMany({
    where: { url: { startsWith: '/uploads/' } },
    data: { url },
  });
  const cats = await prisma.category.updateMany({
    where: { imageUrl: { startsWith: '/uploads/' } },
    data: { imageUrl: url },
  });
  console.log('Updated images', images.count, 'categories', cats.count);
}

main()
  .finally(() => prisma.$disconnect());
