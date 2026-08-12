-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "CrossLink" DROP CONSTRAINT "CrossLink_fromNodeId_fkey";

-- DropForeignKey
ALTER TABLE "CrossLink" DROP CONSTRAINT "CrossLink_toNodeId_fkey";

-- DropForeignKey
ALTER TABLE "CrossLink" DROP CONSTRAINT "CrossLink_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_tierId_fkey";

-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Resource" DROP CONSTRAINT "Resource_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "Tier" DROP CONSTRAINT "Tier_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_ownerId_fkey";

-- DropTable
DROP TABLE "Card";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "CrossLink";

-- DropTable
DROP TABLE "Issue";

-- DropTable
DROP TABLE "Node";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "Resource";

-- DropTable
DROP TABLE "SystemFlag";

-- DropTable
DROP TABLE "Tier";

-- DropTable
DROP TABLE "Workspace";

-- DropEnum
DROP TYPE "CardKind";

-- DropEnum
DROP TYPE "Difficulty";

-- DropEnum
DROP TYPE "NodeKind";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "ResourceType";

-- DropEnum
DROP TYPE "ShareMode";

