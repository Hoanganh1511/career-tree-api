-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "tierId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "yearsOfExperience" INTEGER;

-- CreateTable
CREATE TABLE "Tier" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sublabel" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tier_workspaceId_idx" ON "Tier"("workspaceId");

-- CreateIndex
CREATE INDEX "Node_tierId_idx" ON "Node"("tierId");

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "Tier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tier" ADD CONSTRAINT "Tier_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
