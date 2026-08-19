-- AlterTable
ALTER TABLE "KnowledgeGroup" ADD COLUMN     "certCode" TEXT,
ADD COLUMN     "certName" TEXT;

-- CreateTable
CREATE TABLE "KnowledgeGroupStudyDay" (
    "id" TEXT NOT NULL,
    "knowledgeGroupId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeGroupStudyDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeGroupStudyDay_knowledgeGroupId_idx" ON "KnowledgeGroupStudyDay"("knowledgeGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeGroupStudyDay_knowledgeGroupId_date_key" ON "KnowledgeGroupStudyDay"("knowledgeGroupId", "date");

-- AddForeignKey
ALTER TABLE "KnowledgeGroupStudyDay" ADD CONSTRAINT "KnowledgeGroupStudyDay_knowledgeGroupId_fkey" FOREIGN KEY ("knowledgeGroupId") REFERENCES "KnowledgeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
