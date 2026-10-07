-- CreateTable
CREATE TABLE IF NOT EXISTS "PlannerSettings" (
    "userId" TEXT NOT NULL,
    "weekStartsOn" TEXT NOT NULL DEFAULT 'MONDAY',
    "timeFormat" TEXT NOT NULL DEFAULT '24H',
    "showWeekends" BOOLEAN NOT NULL DEFAULT true,
    "showAllDaySection" BOOLEAN NOT NULL DEFAULT true,
    "density" TEXT NOT NULL DEFAULT 'COMFORTABLE',
    "workingHoursStart" INTEGER NOT NULL DEFAULT 480,
    "workingHoursEnd" INTEGER NOT NULL DEFAULT 1320,
    "firstVisibleHour" INTEGER NOT NULL DEFAULT 0,
    "lastVisibleHour" INTEGER NOT NULL DEFAULT 24,
    "timeSlotMinutes" INTEGER NOT NULL DEFAULT 30,
    "showTaskType" BOOLEAN NOT NULL DEFAULT true,
    "showDuration" BOOLEAN NOT NULL DEFAULT true,
    "showArea" BOOLEAN NOT NULL DEFAULT false,
    "showProject" BOOLEAN NOT NULL DEFAULT false,
    "showPriority" BOOLEAN NOT NULL DEFAULT true,
    "completedTaskDisplay" TEXT NOT NULL DEFAULT 'KEEP_VISIBLE',
    "completedTaskStyle" TEXT NOT NULL DEFAULT 'CHECK_ICON',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerSettings_pkey" PRIMARY KEY ("userId")
);
