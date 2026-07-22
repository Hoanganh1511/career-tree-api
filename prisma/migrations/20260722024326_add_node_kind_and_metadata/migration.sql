/*
  Warnings:

  - The `kind` column on the `Node` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "NodeKind" AS ENUM ('BRANCH', 'TOPIC');

-- AlterTable
ALTER TABLE "Node" DROP COLUMN "kind",
ADD COLUMN     "kind" "NodeKind" NOT NULL DEFAULT 'BRANCH';

-- DropEnum
DROP TYPE "NodeKin";
