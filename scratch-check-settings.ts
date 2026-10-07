import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.ts';

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM "PlannerSettings"',
  );
  console.log(JSON.stringify(rows, null, 2));
  await prisma.$disconnect();
}

main();
