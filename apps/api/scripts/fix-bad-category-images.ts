import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const prisma = new PrismaClient();
const GOOD =
  'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80';

async function main() {
  const result = await prisma.category.updateMany({
    where: {
      OR: [{ imageUrl: { contains: 'cat.jpg' } }, { imageUrl: { contains: 'example.com' } }],
    },
    data: { imageUrl: GOOD },
  });
  console.log(`Updated ${result.count} categor(ies)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
