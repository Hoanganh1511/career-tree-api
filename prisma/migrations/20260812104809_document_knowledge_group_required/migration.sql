-- All existing Document rows have been backfilled with a default
-- Workspace/KnowledgeGroup ("Tài liệu của tôi" / "Chưa phân loại") via a
-- one-off script before this migration - safe to make the column required.
ALTER TABLE "Document" ALTER COLUMN "knowledgeGroupId" SET NOT NULL;
