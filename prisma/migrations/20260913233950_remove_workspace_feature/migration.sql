-- Xoa cac Notification thuoc loai sap bi bo (GROUP_COLLAB_*) TRUOC khi doi
-- enum - cac dong nay thuoc DUNG tinh nang Workspace/KnowledgeGroup dang bi
-- xoa, khong con y nghia gi khi tinh nang goc da mat.
DELETE FROM "Notification" WHERE "type" NOT IN ('FOLLOW');

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('FOLLOW');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ChecklistItem" DROP CONSTRAINT "ChecklistItem_documentId_fkey";

-- DropForeignKey
ALTER TABLE "ChecklistItemLog" DROP CONSTRAINT "ChecklistItemLog_checklistItemId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_knowledgeGroupId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_seriesId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentSeries" DROP CONSTRAINT "DocumentSeries_knowledgeGroupId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeGroup" DROP CONSTRAINT "KnowledgeGroup_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeGroupCollaborator" DROP CONSTRAINT "KnowledgeGroupCollaborator_groupId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeGroupCollaborator" DROP CONSTRAINT "KnowledgeGroupCollaborator_userId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeGroupStudyDay" DROP CONSTRAINT "KnowledgeGroupStudyDay_knowledgeGroupId_fkey";

-- DropForeignKey
ALTER TABLE "LearningObjective" DROP CONSTRAINT "LearningObjective_knowledgeGroupId_fkey";

-- DropForeignKey
ALTER TABLE "LearningObjectiveItem" DROP CONSTRAINT "LearningObjectiveItem_objectiveId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_ownerId_fkey";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "collabId",
DROP COLUMN "groupId";

-- DropTable
DROP TABLE "ChecklistItem";

-- DropTable
DROP TABLE "ChecklistItemLog";

-- DropTable
DROP TABLE "Document";

-- DropTable
DROP TABLE "DocumentSeries";

-- DropTable
DROP TABLE "KnowledgeGroup";

-- DropTable
DROP TABLE "KnowledgeGroupCollaborator";

-- DropTable
DROP TABLE "KnowledgeGroupStudyDay";

-- DropTable
DROP TABLE "LearningObjective";

-- DropTable
DROP TABLE "LearningObjectiveItem";

-- DropTable
DROP TABLE "Workspace";

-- DropEnum
DROP TYPE "ChecklistGroup";

-- DropEnum
DROP TYPE "ChecklistStatus";

-- DropEnum
DROP TYPE "KnowledgeGroupCollabStatus";

-- DropEnum
DROP TYPE "KnowledgeGroupVisibility";

-- DropEnum
DROP TYPE "ObjectiveItemType";

