-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinnedAt" TIMESTAMP(3);
