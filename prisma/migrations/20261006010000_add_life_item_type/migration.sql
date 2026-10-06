-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LifeItemType" AS ENUM ('ACTION','EVENT','HABIT','REFLECTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LifeItemPriority" AS ENUM ('HIGH','MEDIUM','LOW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "PlannerItem" ADD COLUMN IF NOT EXISTS "itemType" "LifeItemType" NOT NULL DEFAULT 'ACTION';
ALTER TABLE "PlannerItem" ADD COLUMN IF NOT EXISTS "priority" "LifeItemPriority";
ALTER TABLE "PlannerItem" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "PlannerItem" ADD COLUMN IF NOT EXISTS "area" TEXT;
ALTER TABLE "PlannerItem" ADD COLUMN IF NOT EXISTS "project" TEXT;
ALTER TABLE "PlannerItem" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "PlannerItem" ADD COLUMN IF NOT EXISTS "deadline" DATE;
ALTER TABLE "PlannerItem" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlannerTypeColor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LifeItemType" NOT NULL,
    "paletteId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerTypeColor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PlannerTypeColor_userId_type_key" ON "PlannerTypeColor"("userId", "type");
