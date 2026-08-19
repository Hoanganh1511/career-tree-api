-- CreateEnum
CREATE TYPE "ChecklistGroup" AS ENUM ('OBJECTIVE', 'RESOURCE', 'PRACTICE', 'ASSESSMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChecklistStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "ChecklistStatus" ADD VALUE 'NEEDS_REVIEW';

-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN     "group" "ChecklistGroup" NOT NULL DEFAULT 'OBJECTIVE';
