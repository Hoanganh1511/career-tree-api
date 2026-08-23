import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Seed 1 book mau cho GL Life Book - dung DEMO_USER_ID giong het hang so
// hardcode trong BooksController (chua co auth that o tinh nang nay).
// order 0 = trang muc luc (rong), order 1/2/3 = 3 trang noi dung dau tien
// (cung rong, chua co block nao) - khop spec Phase 2 ("4 pages: muc luc +
// 3"). Sach seed dau tien cua Phase 1 (id 26145d9c-51c4-4f44-bc8d-f70011b03f15)
// chi co 3 trang (order 0/1/2) vi Phase 1 luc do chi yeu cau vay - Book.tsx
// (Phase 2) hoat dong dung voi BAT KY so trang nao (kho khong phai 4), nen
// KHONG can reseed sach cu; script nay chi doi cho lan seed MOI ve sau.
const DEMO_USER_ID = 'demo-user';

async function main() {
  const book = await prisma.book.create({
    data: {
      userId: DEMO_USER_ID,
      title: 'GL Life Book',
      pages: {
        create: [{ order: 0 }, { order: 1 }, { order: 2 }, { order: 3 }],
      },
    },
    include: { pages: true },
  });

  console.log('Seeded book:', book.id);
  console.log('Pages:', book.pages.map((p) => `${p.id} (order ${p.order})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
