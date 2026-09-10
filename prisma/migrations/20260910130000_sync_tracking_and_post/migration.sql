-- Baseline: cac thay doi nay da co san trong database (duoc ap thang qua
-- `prisma db push` truoc do, chua tung co migration file). Migration nay
-- chi de dong bo migration history voi schema.prisma / DB thuc te - khong
-- chay tay, xem huong dan resolve trong huong dan xu ly drift.

-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('DRAFT', 'PUBLIC', 'LIMITED');

-- CreateEnum
CREATE TYPE "TrackingTimeBlockKind" AS ENUM ('FOCUSED', 'GENERAL', 'LIFE', 'BUFFER');

-- CreateEnum
CREATE TYPE "TrackingSkipReason" AS ENUM ('AVOIDANCE', 'OUT_OF_TIME', 'INTERRUPTED', 'MISESTIMATED');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "likesEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "role" TEXT;

-- CreateTable
CREATE TABLE "TrackingGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "startDate" DATE,
    "targetDate" DATE,
    "important" BOOLEAN NOT NULL DEFAULT true,
    "controllable" BOOLEAN NOT NULL DEFAULT true,
    "why" TEXT,
    "estimatedHoursPerWeek" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingMilestone" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weeklyGoalNote" TEXT,

    CONSTRAINT "TrackingMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingGoalStep" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "title" TEXT NOT NULL,
    "dueDate" DATE,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER,

    CONSTRAINT "TrackingGoalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingSettings" (
    "userId" TEXT NOT NULL,
    "weeklyAvailableHours" DOUBLE PRECISION NOT NULL DEFAULT 20,

    CONSTRAINT "TrackingSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "TrackingTimeBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "TrackingTimeBlockKind" NOT NULL DEFAULT 'GENERAL',
    "goalStepId" TEXT,

    CONSTRAINT "TrackingTimeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "timeBlockId" TEXT,
    "estimatedMinutes" INTEGER,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "skipReason" "TrackingSkipReason",
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postponedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TrackingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEnergyCheckin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "physical" INTEGER NOT NULL,
    "emotional" INTEGER NOT NULL,
    "mental" INTEGER NOT NULL,

    CONSTRAINT "TrackingEnergyCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingWellnessLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sleepHours" DOUBLE PRECISION,
    "sleepQuality" INTEGER,
    "napMinutes" INTEGER,
    "exerciseMinutes" INTEGER,
    "mealsLogged" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "TrackingWellnessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingGroupMember" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingGroupMember_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "TrackingGroupSession" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalText" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "TrackingGroupSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackingGoal_userId_targetDate_idx" ON "TrackingGoal"("userId", "targetDate");

-- CreateIndex
CREATE INDEX "TrackingMilestone_goalId_orderIndex_idx" ON "TrackingMilestone"("goalId", "orderIndex");

-- CreateIndex
CREATE INDEX "TrackingGoalStep_goalId_orderIndex_idx" ON "TrackingGoalStep"("goalId", "orderIndex");

-- CreateIndex
CREATE INDEX "TrackingGoalStep_milestoneId_orderIndex_idx" ON "TrackingGoalStep"("milestoneId", "orderIndex");

-- CreateIndex
CREATE INDEX "TrackingTimeBlock_userId_date_idx" ON "TrackingTimeBlock"("userId", "date");

-- CreateIndex
CREATE INDEX "TrackingTask_userId_date_idx" ON "TrackingTask"("userId", "date");

-- CreateIndex
CREATE INDEX "TrackingEnergyCheckin_userId_checkedAt_idx" ON "TrackingEnergyCheckin"("userId", "checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingWellnessLog_userId_date_key" ON "TrackingWellnessLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingGroup_inviteCode_key" ON "TrackingGroup"("inviteCode");

-- CreateIndex
CREATE INDEX "TrackingGroupSession_groupId_startedAt_idx" ON "TrackingGroupSession"("groupId", "startedAt");

-- CreateIndex
CREATE INDEX "Post_visibility_createdAt_idx" ON "Post"("visibility", "createdAt");

-- AddForeignKey
ALTER TABLE "TrackingMilestone" ADD CONSTRAINT "TrackingMilestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "TrackingGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingGoalStep" ADD CONSTRAINT "TrackingGoalStep_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "TrackingGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingGoalStep" ADD CONSTRAINT "TrackingGoalStep_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "TrackingMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingGroupMember" ADD CONSTRAINT "TrackingGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TrackingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingGroupSession" ADD CONSTRAINT "TrackingGroupSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TrackingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
