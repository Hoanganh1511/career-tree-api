-- CreateEnum
CREATE TYPE "ObjectiveItemType" AS ENUM ('KNOWLEDGE', 'SKILL');

-- CreateTable
CREATE TABLE "LearningObjective" (
    "id" TEXT NOT NULL,
    "knowledgeGroupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningObjectiveItem" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "type" "ObjectiveItemType" NOT NULL,
    "label" TEXT NOT NULL,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'NOT_UNDERSTOOD',
    "note" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningObjectiveItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningObjective_knowledgeGroupId_orderIndex_idx" ON "LearningObjective"("knowledgeGroupId", "orderIndex");

-- CreateIndex
CREATE INDEX "LearningObjectiveItem_objectiveId_type_orderIndex_idx" ON "LearningObjectiveItem"("objectiveId", "type", "orderIndex");

-- AddForeignKey
ALTER TABLE "LearningObjective" ADD CONSTRAINT "LearningObjective_knowledgeGroupId_fkey" FOREIGN KEY ("knowledgeGroupId") REFERENCES "KnowledgeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningObjectiveItem" ADD CONSTRAINT "LearningObjectiveItem_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "LearningObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
