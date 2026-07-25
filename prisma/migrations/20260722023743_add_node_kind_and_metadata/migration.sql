-- CreateEnum
CREATE TYPE "NodeKin" AS ENUM ('BRANCH', 'TOPIC');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "category" TEXT,
ADD COLUMN     "difficulty" "Difficulty",
ADD COLUMN     "estimatedTime" TEXT,
ADD COLUMN     "kind" "NodeKin" NOT NULL DEFAULT 'BRANCH',
ADD COLUMN     "learningOutcomes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[];
