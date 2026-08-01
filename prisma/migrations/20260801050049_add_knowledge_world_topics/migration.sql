-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PostCategory" ADD VALUE 'ALGORITHMS';
ALTER TYPE "PostCategory" ADD VALUE 'ARCHITECTURE';
ALTER TYPE "PostCategory" ADD VALUE 'PERFORMANCE';
ALTER TYPE "PostCategory" ADD VALUE 'DISTRIBUTED_SYSTEMS';
ALTER TYPE "PostCategory" ADD VALUE 'PROMPT_ENGINEERING';
ALTER TYPE "PostCategory" ADD VALUE 'LLM';
ALTER TYPE "PostCategory" ADD VALUE 'AI_AGENTS';
ALTER TYPE "PostCategory" ADD VALUE 'MCP';
ALTER TYPE "PostCategory" ADD VALUE 'RAG';
ALTER TYPE "PostCategory" ADD VALUE 'COMPUTER_VISION';
ALTER TYPE "PostCategory" ADD VALUE 'UI';
ALTER TYPE "PostCategory" ADD VALUE 'UX';
ALTER TYPE "PostCategory" ADD VALUE 'MOTION';
ALTER TYPE "PostCategory" ADD VALUE 'FIGMA';
ALTER TYPE "PostCategory" ADD VALUE 'DESIGN_SYSTEM';
ALTER TYPE "PostCategory" ADD VALUE 'RESUME';
ALTER TYPE "PostCategory" ADD VALUE 'INTERVIEW';
ALTER TYPE "PostCategory" ADD VALUE 'PRODUCTIVITY';
ALTER TYPE "PostCategory" ADD VALUE 'REMOTE';
ALTER TYPE "PostCategory" ADD VALUE 'FREELANCE';
ALTER TYPE "PostCategory" ADD VALUE 'STARTUP';
ALTER TYPE "PostCategory" ADD VALUE 'GROWTH';
ALTER TYPE "PostCategory" ADD VALUE 'MARKETING';
