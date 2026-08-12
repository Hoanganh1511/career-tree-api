-- CreateEnum
CREATE TYPE "KnowledgeGroupVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "KnowledgeGroupCollabStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeGroup" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "KnowledgeGroupVisibility" NOT NULL DEFAULT 'PRIVATE',
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeGroupCollaborator" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "KnowledgeGroupCollabStatus" NOT NULL DEFAULT 'PENDING',
    "joinReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeGroupCollaborator_pkey" PRIMARY KEY ("id")
);

-- AlterTable (nullable for now - backfilled by a follow-up script before the
-- next migration makes it NOT NULL, since 1 real Document row already exists)
ALTER TABLE "Document" ADD COLUMN "knowledgeGroupId" TEXT;

-- CreateIndex
CREATE INDEX "Workspace_ownerId_orderIndex_idx" ON "Workspace"("ownerId", "orderIndex");

-- CreateIndex
CREATE INDEX "KnowledgeGroup_workspaceId_orderIndex_idx" ON "KnowledgeGroup"("workspaceId", "orderIndex");

-- CreateIndex
CREATE INDEX "KnowledgeGroupCollaborator_groupId_status_idx" ON "KnowledgeGroupCollaborator"("groupId", "status");

-- CreateIndex
CREATE INDEX "KnowledgeGroupCollaborator_userId_idx" ON "KnowledgeGroupCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeGroupCollaborator_groupId_userId_key" ON "KnowledgeGroupCollaborator"("groupId", "userId");

-- CreateIndex
CREATE INDEX "Document_knowledgeGroupId_isPinned_updatedAt_idx" ON "Document"("knowledgeGroupId", "isPinned", "updatedAt");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeGroup" ADD CONSTRAINT "KnowledgeGroup_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeGroupCollaborator" ADD CONSTRAINT "KnowledgeGroupCollaborator_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "KnowledgeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeGroupCollaborator" ADD CONSTRAINT "KnowledgeGroupCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_knowledgeGroupId_fkey" FOREIGN KEY ("knowledgeGroupId") REFERENCES "KnowledgeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
