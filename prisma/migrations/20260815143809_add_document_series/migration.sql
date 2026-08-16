-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "seriesId" TEXT;

-- CreateTable
CREATE TABLE "DocumentSeries" (
    "id" TEXT NOT NULL,
    "knowledgeGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentSeries_knowledgeGroupId_orderIndex_idx" ON "DocumentSeries"("knowledgeGroupId", "orderIndex");

-- CreateIndex
CREATE INDEX "Document_seriesId_idx" ON "Document"("seriesId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "DocumentSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSeries" ADD CONSTRAINT "DocumentSeries_knowledgeGroupId_fkey" FOREIGN KEY ("knowledgeGroupId") REFERENCES "KnowledgeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
