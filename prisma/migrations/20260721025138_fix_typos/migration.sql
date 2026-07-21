/*
  Warnings:

  - You are about to drop the column `legacyBackfilDone` on the `SystemFlag` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SystemFlag" DROP COLUMN "legacyBackfilDone",
ADD COLUMN     "legacyBackfillDone" BOOLEAN NOT NULL DEFAULT false;
