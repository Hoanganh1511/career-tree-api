-- [2026-10-12] Dinh kem PlannerItem <-> ContentSeries(/Entry) - xem comment
-- day du tren model PlannerItemAttachment (schema.prisma). Viet tay (khong
-- qua `prisma migrate dev`) vi DB hien co drift tu lau o cac bang khong
-- lien quan (ContentSeries/ContentSeriesEntry/Message - da ghi nhan tu lan
-- migrate Planner truoc, 2026-10-09) khien `migrate dev` doi RESET toan bo
-- schema - KHONG duoc phep (se xoa du lieu cac module khac). Migration nay
-- CHI tao 1 bang moi, khong dung cham gi den cac bang dang drift, nen
-- IF NOT EXISTS/idempotent la du an toan de ap truc tiep.

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlannerItemAttachment" (
    "id" TEXT NOT NULL,
    "plannerItemId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "entryId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannerItemAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlannerItemAttachment_plannerItemId_orderIndex_idx"
  ON "PlannerItemAttachment"("plannerItemId", "orderIndex");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlannerItemAttachment_seriesId_idx"
  ON "PlannerItemAttachment"("seriesId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlannerItemAttachment_entryId_idx"
  ON "PlannerItemAttachment"("entryId");

-- AddForeignKey (idempotent - ADD CONSTRAINT khong co IF NOT EXISTS trong
-- Postgres, bat loi duplicate_object neu chay lai).
DO $$ BEGIN
  ALTER TABLE "PlannerItemAttachment"
    ADD CONSTRAINT "PlannerItemAttachment_plannerItemId_fkey"
    FOREIGN KEY ("plannerItemId") REFERENCES "PlannerItem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PlannerItemAttachment"
    ADD CONSTRAINT "PlannerItemAttachment_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "ContentSeries"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PlannerItemAttachment"
    ADD CONSTRAINT "PlannerItemAttachment_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "ContentSeriesEntry"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
