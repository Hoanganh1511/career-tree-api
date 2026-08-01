-- CreateEnum
CREATE TYPE "ContestKind" AS ENUM ('CONTEST', 'TOPIC');

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('OPEN', 'JUDGING', 'CLOSED');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "careerCategoryId" TEXT;

-- CreateTable
CREATE TABLE "CareerCategoryGroup" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerCategoryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerCategory" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "hashtag" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" "ContestKind" NOT NULL,
    "status" "ContestStatus" NOT NULL DEFAULT 'OPEN',
    "partnerName" TEXT,
    "coverImageUrl" TEXT,
    "accent" TEXT,
    "prize" TEXT,
    "deadline" TIMESTAMP(3),
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostContest" (
    "postId" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostContest_pkey" PRIMARY KEY ("postId","contestId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CareerCategoryGroup_slug_key" ON "CareerCategoryGroup"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CareerCategory_slug_key" ON "CareerCategory"("slug");

-- CreateIndex
CREATE INDEX "CareerCategory_groupId_idx" ON "CareerCategory"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Contest_slug_key" ON "Contest"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Contest_hashtag_key" ON "Contest"("hashtag");

-- CreateIndex
CREATE INDEX "Contest_status_createdAt_idx" ON "Contest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PostContest_contestId_createdAt_idx" ON "PostContest"("contestId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_careerCategoryId_createdAt_idx" ON "Post"("careerCategoryId", "createdAt");

-- AddForeignKey
ALTER TABLE "CareerCategory" ADD CONSTRAINT "CareerCategory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CareerCategoryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostContest" ADD CONSTRAINT "PostContest_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostContest" ADD CONSTRAINT "PostContest_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_careerCategoryId_fkey" FOREIGN KEY ("careerCategoryId") REFERENCES "CareerCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
