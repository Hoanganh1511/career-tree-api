-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('NOT_UNDERSTOOD', 'UNDERSTOOD');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "checklistLogPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'NOT_UNDERSTOOD',
    "note" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItemLog" (
    "id" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "toStatus" "ChecklistStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItemLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistItem_documentId_orderIndex_idx" ON "ChecklistItem"("documentId", "orderIndex");

-- CreateIndex
CREATE INDEX "ChecklistItemLog_checklistItemId_createdAt_idx" ON "ChecklistItemLog"("checklistItemId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemLog" ADD CONSTRAINT "ChecklistItemLog_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
