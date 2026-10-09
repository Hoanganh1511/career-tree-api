-- Planner refactor: Task/Event/Reminder domain model [2026-10-09]
--
-- Thay the model cu (date + scheduledMinute + durationMinutes + itemType
-- ACTION/EVENT/HABIT/REFLECTION + kind SIMPLE/BIG + parent/children +
-- area/project/tags/metadata/isFocus/color/done) bang model moi:
--   type (TASK|EVENT|REMINDER) + category + status + priority +
--   scheduleKind (UNSCHEDULED|DEADLINE|TIMED|ALL_DAY) + startAt/endAt/dueAt +
--   location/meetingUrl/checklist/recurrence
--
-- Migration nay BAO TOAN du lieu cu (backfill tung buoc truoc khi DROP cot),
-- KHONG dung `prisma migrate reset` - DB nay co drift o cac module KHAC
-- (ContentSeriesEntry/Message...) nen reset se xoa SACH du lieu khong lien
-- quan. Ap dung truc tiep roi `prisma migrate resolve --applied`.

-- ---------------------------------------------------------------------------
-- 1. Enum moi
-- ---------------------------------------------------------------------------
CREATE TYPE "PlannerItemType" AS ENUM ('TASK', 'EVENT', 'REMINDER');
CREATE TYPE "PlannerCategory" AS ENUM ('STUDY', 'MEETING', 'DEADLINE', 'PERSONAL', 'SPORTS', 'CALL', 'BREAK', 'OTHER');
CREATE TYPE "PlannerStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_ATTENTION', 'OVERDUE', 'CANCELLED');
CREATE TYPE "PlannerPriority" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "PlannerScheduleKind" AS ENUM ('UNSCHEDULED', 'DEADLINE', 'TIMED', 'ALL_DAY');

-- ---------------------------------------------------------------------------
-- 2. Doi ten cot cu bi TRUNG TEN voi cot moi (status/priority) de backfill
--    duoc truoc khi xoa.
-- ---------------------------------------------------------------------------
ALTER TABLE "PlannerItem" RENAME COLUMN "status" TO "legacy_status";
ALTER TABLE "PlannerItem" RENAME COLUMN "priority" TO "legacy_priority";

-- ---------------------------------------------------------------------------
-- 3. Them cot moi (nullable / co default de khong vo dong hien co)
-- ---------------------------------------------------------------------------
ALTER TABLE "PlannerItem"
  ADD COLUMN "type"         "PlannerItemType",
  ADD COLUMN "category"     "PlannerCategory"     NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "status"       "PlannerStatus"       NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN "priority_new" "PlannerPriority"     NOT NULL DEFAULT 'NONE',
  ADD COLUMN "scheduleKind" "PlannerScheduleKind" NOT NULL DEFAULT 'UNSCHEDULED',
  ADD COLUMN "startAt"      TIMESTAMP(3),
  ADD COLUMN "endAt"        TIMESTAMP(3),
  ADD COLUMN "dueAt"        TIMESTAMP(3),
  ADD COLUMN "location"     TEXT,
  ADD COLUMN "meetingUrl"   TEXT,
  ADD COLUMN "checklist"    JSONB,
  ADD COLUMN "recurrence"   JSONB;

-- ---------------------------------------------------------------------------
-- 4. Backfill
-- ---------------------------------------------------------------------------

-- 4a. type: EVENT giu nguyen; ACTION/HABIT/REFLECTION -> TASK (bo 2 loai sau)
UPDATE "PlannerItem"
SET "type" = CASE WHEN "itemType" = 'EVENT' THEN 'EVENT'::"PlannerItemType"
                  ELSE 'TASK'::"PlannerItemType" END;

-- 4b. category: suy tu `area` cu (text tu do) + metadata.meetingUrl
UPDATE "PlannerItem"
SET "category" = (CASE
  WHEN "metadata" ->> 'meetingUrl' IS NOT NULL                   THEN 'MEETING'
  WHEN lower(coalesce("area", '')) ~ 'stud|learn|hoc'            THEN 'STUDY'
  WHEN lower(coalesce("area", '')) ~ 'meet|work|hop'             THEN 'MEETING'
  WHEN lower(coalesce("area", '')) ~ 'personal|life|family'      THEN 'PERSONAL'
  WHEN lower(coalesce("area", '')) ~ 'sport|health|gym'          THEN 'SPORTS'
  WHEN lower(coalesce("area", '')) ~ 'call|phone'                THEN 'CALL'
  WHEN lower(coalesce("area", '')) ~ 'break|rest'                THEN 'BREAK'
  ELSE 'OTHER'
END)::"PlannerCategory";

-- 4c. status: done -> COMPLETED, con lai SCHEDULED (OVERDUE duoc SUY RA luc
--     doc, khong luu cung - xem PlannerService.deriveStatus()).
UPDATE "PlannerItem"
SET "status" = CASE WHEN "done" THEN 'COMPLETED'::"PlannerStatus"
                    ELSE 'SCHEDULED'::"PlannerStatus" END;

-- 4d. priority: NULL -> NONE
UPDATE "PlannerItem"
SET "priority_new" = (CASE "legacy_priority"::text
  WHEN 'HIGH'   THEN 'HIGH'
  WHEN 'MEDIUM' THEN 'MEDIUM'
  WHEN 'LOW'    THEN 'LOW'
  ELSE 'NONE'
END)::"PlannerPriority";

-- 4e. scheduleKind + startAt/endAt/dueAt
--     co gio -> TIMED (endAt = start + duration, mac dinh 60')
UPDATE "PlannerItem"
SET "scheduleKind" = 'TIMED'::"PlannerScheduleKind",
    "startAt" = ("date" + ("scheduledMinute" || ' minutes')::interval),
    "endAt"   = ("date" + (("scheduledMinute" + COALESCE("durationMinutes", 60)) || ' minutes')::interval)
WHERE "scheduledMinute" IS NOT NULL;

--     khong gio nhung co deadline -> DEADLINE. Cot `deadline` cu la @db.Date
--     nen phan GIO da mat tu truoc; mac dinh 09:00 de khong roi ve 00:00.
UPDATE "PlannerItem"
SET "scheduleKind" = 'DEADLINE'::"PlannerScheduleKind",
    "dueAt" = ("deadline" + interval '9 hours')
WHERE "scheduledMinute" IS NULL AND "deadline" IS NOT NULL;

--     EVENT khong gio, khong deadline -> ALL_DAY (1 ngay)
UPDATE "PlannerItem"
SET "scheduleKind" = 'ALL_DAY'::"PlannerScheduleKind",
    "startAt" = "date"::timestamp,
    "endAt"   = "date"::timestamp
WHERE "scheduledMinute" IS NULL AND "deadline" IS NULL AND "itemType" = 'EVENT';

-- 4f. location / meetingUrl tach khoi metadata Json
UPDATE "PlannerItem"
SET "location"   = NULLIF("metadata" ->> 'location', ''),
    "meetingUrl" = NULLIF("metadata" ->> 'meetingUrl', '')
WHERE "metadata" IS NOT NULL;

-- 4g. checklist tu metadata.subtasks (shape cua ReminderForm)
UPDATE "PlannerItem"
SET "checklist" = "metadata" -> 'subtasks'
WHERE "metadata" -> 'subtasks' IS NOT NULL
  AND jsonb_typeof("metadata" -> 'subtasks') = 'array';

-- 4h. Gop item CON (parentId) vao checklist cua CHA roi xoa - model moi bo
--     han quan he parent/children 1 cap.
UPDATE "PlannerItem" p
SET "checklist" = COALESCE(p."checklist", '[]'::jsonb) || k.items
FROM (
  SELECT ordered.pid AS pid, jsonb_agg(ordered.obj) AS items
  FROM (
    SELECT "parentId" AS pid,
           jsonb_build_object('id', "id", 'title', "title", 'done', "done") AS obj
    FROM "PlannerItem"
    WHERE "parentId" IS NOT NULL
    ORDER BY "parentId", "orderIndex"
  ) ordered
  GROUP BY ordered.pid
) k
WHERE p."id" = k.pid;

DELETE FROM "PlannerItem" WHERE "parentId" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Chot cot moi, bo cot/rang buoc cu
-- ---------------------------------------------------------------------------
ALTER TABLE "PlannerItem" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "PlannerItem" RENAME COLUMN "priority_new" TO "priority";

DROP INDEX IF EXISTS "PlannerItem_userId_date_idx";
DROP INDEX IF EXISTS "PlannerItem_parentId_idx";
ALTER TABLE "PlannerItem" DROP CONSTRAINT IF EXISTS "PlannerItem_parentId_fkey";

ALTER TABLE "PlannerItem"
  DROP COLUMN "date",
  DROP COLUMN "kind",
  DROP COLUMN "itemType",
  DROP COLUMN "color",
  DROP COLUMN "colorPaletteId",
  DROP COLUMN "scheduledMinute",
  DROP COLUMN "durationMinutes",
  DROP COLUMN "isFocus",
  DROP COLUMN "done",
  DROP COLUMN "legacy_status",
  DROP COLUMN "legacy_priority",
  DROP COLUMN "area",
  DROP COLUMN "project",
  DROP COLUMN "tags",
  DROP COLUMN "deadline",
  DROP COLUMN "metadata",
  DROP COLUMN "parentId";

CREATE INDEX "PlannerItem_userId_startAt_idx" ON "PlannerItem"("userId", "startAt");
CREATE INDEX "PlannerItem_userId_dueAt_idx"   ON "PlannerItem"("userId", "dueAt");
CREATE INDEX "PlannerItem_userId_status_idx"  ON "PlannerItem"("userId", "status");

-- ---------------------------------------------------------------------------
-- 6. PlannerTypeColor (theo itemType) -> PlannerCategoryColor (theo category)
-- ---------------------------------------------------------------------------
CREATE TABLE "PlannerCategoryColor" (
  "id"        TEXT              NOT NULL,
  "userId"    TEXT              NOT NULL,
  "category"  "PlannerCategory" NOT NULL,
  "main"      TEXT              NOT NULL,
  "light"     TEXT              NOT NULL,
  "border"    TEXT              NOT NULL,
  "updatedAt" TIMESTAMP(3)      NOT NULL,
  CONSTRAINT "PlannerCategoryColor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlannerCategoryColor_userId_category_key"
  ON "PlannerCategoryColor"("userId", "category");

-- Khong backfill: paletteId cu tham chieu bang palette theo ITEM TYPE (4 loai
-- cu), khong anh xa duoc sang 8 category moi. Vang mat = dung mau mac dinh
-- cua category (design reference).
DROP TABLE "PlannerTypeColor";

-- ---------------------------------------------------------------------------
-- 7. PlannerSettings: field hien thi bam theo bo cot moi
-- ---------------------------------------------------------------------------
ALTER TABLE "PlannerSettings" RENAME COLUMN "showTaskType" TO "showCategory";
ALTER TABLE "PlannerSettings" DROP COLUMN "showArea";
ALTER TABLE "PlannerSettings" DROP COLUMN "showProject";
ALTER TABLE "PlannerSettings" ADD COLUMN "showStatus"   BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PlannerSettings" ADD COLUMN "showLocation" BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 8. Bo enum cu (chi Planner dung, da xac nhan khong model nao khac tham chieu)
-- ---------------------------------------------------------------------------
DROP TYPE "LifeItemType";
DROP TYPE "LifeItemPriority";
DROP TYPE "PlannerItemKind";
