-- CreateEnum
CREATE TYPE "CardKind" AS ENUM ('NOTE', 'PRACTICE');

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "kind" "CardKind" NOT NULL DEFAULT 'NOTE';

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "goal" TEXT;

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Issue_nodeId_idx" ON "Issue"("nodeId");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
