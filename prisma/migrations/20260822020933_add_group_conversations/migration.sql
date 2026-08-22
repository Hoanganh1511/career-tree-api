-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "avatarColor" TEXT,
ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT;
