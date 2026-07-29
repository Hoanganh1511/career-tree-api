-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('TEXT', 'IMAGE', 'GALLERY', 'VIDEO', 'FILE', 'LINK', 'RESOURCE', 'NOTE', 'PROJECT_UPDATE', 'ACHIEVEMENT', 'MILESTONE', 'QUESTION', 'POLL', 'CAREER_UPDATE', 'SKILL_UPDATE', 'NODE_CREATED', 'KNOWLEDGE_BLOCK', 'TIMELINE_EVENT', 'CODE_SNIPPET', 'IDEA', 'TUTORIAL', 'EXPERIMENT', 'EVENT', 'SKILL_REPORT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "username" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "PostKind" NOT NULL,
    "data" JSONB NOT NULL,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "repostsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

