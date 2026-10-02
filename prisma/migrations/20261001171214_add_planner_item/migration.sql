-- [2026-10-01] Migration nay duoc TAO TAY (khong qua `prisma migrate dev`) -
-- database dev/prod hien dang bi "drift" tu truoc (ContentSeries/ContentSeriesEntry/
-- Message co cot/index thuc te khong khop migration history, xem comment
-- BASELINE KHOI PHUC 2026-09-08 o migration 20260905172827_add_goal_roadmap_node
-- cho 1 su co tuong tu truoc day) - `prisma migrate dev`/`--create-only` deu
-- tu choi chay va doi `migrate reset` (xoa sach DB) vi phat hien drift DO,
-- KHONG lien quan gi toi thay doi nay. SQL duoi day CHI tao 1 enum + 1 bang
-- HOAN TOAN MOI (PlannerItem, tinh nang Planner /planner) - khong dung cham
-- gi den cac bang dang drift o tren, nen an toan de chay THANG qua
-- `prisma db execute` (bo qua buoc doi chieu shadow-db dang bi chan) roi danh
-- dau da ap dung qua `prisma migrate resolve --applied`.

-- CreateEnum
CREATE TYPE "PlannerItemKind" AS ENUM ('SIMPLE', 'BIG');

-- CreateTable
CREATE TABLE "PlannerItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "PlannerItemKind" NOT NULL DEFAULT 'SIMPLE',
    "scheduledMinute" INTEGER,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannerItem_userId_date_idx" ON "PlannerItem"("userId", "date");

-- CreateIndex
CREATE INDEX "PlannerItem_parentId_idx" ON "PlannerItem"("parentId");

-- AddForeignKey
ALTER TABLE "PlannerItem" ADD CONSTRAINT "PlannerItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PlannerItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
