-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('FRONTEND', 'BACKEND', 'MOBILE', 'GAME_DEV', 'BLOCKCHAIN', 'IOT', 'DEV_TOOLS', 'DATA_AI', 'DATABASE', 'PRODUCT', 'UI_UX', 'DEVOPS', 'CLOUD', 'SYSTEM_DESIGN', 'SECURITY', 'QA_TEST', 'CAREER', 'SOFT_SKILLS');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "category" "PostCategory";

-- CreateIndex
CREATE INDEX "Post_category_createdAt_idx" ON "Post"("category", "createdAt");
