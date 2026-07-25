/*
  Warnings:

  - You are about to drop the column `workspaceId` on the `Tier` table. All data
    has already been backfilled into `Category`/`Tier.categoryId` via
    prisma/backfill-category.ts before this migration.
  - Made the column `categoryId` on table `Tier` required.

*/
-- AlterTable
ALTER TABLE "Tier" DROP COLUMN "workspaceId",
ALTER COLUMN "categoryId" SET NOT NULL;
