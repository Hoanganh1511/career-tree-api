-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "requestedById" TEXT,
ADD COLUMN     "status" "ChannelStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Channel_communityId_status_idx" ON "Channel"("communityId", "status");

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
