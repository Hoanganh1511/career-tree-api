-- CreateTable
CREATE TABLE "EnglishConcept" (
    "id" TEXT NOT NULL,
    "unit" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EnglishConceptCategory" NOT NULL,
    "relatedConceptNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnglishConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnglishQuestion" (
    "id" TEXT NOT NULL,
    "unit" INTEGER NOT NULL,
    "conceptTags" TEXT[],
    "questionType" "EnglishQuestionType" NOT NULL,
    "difficulty" "EnglishDifficulty" NOT NULL,
    "stem" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOptionId" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "distractorExplanations" JSONB NOT NULL,
    "minTimeSeconds" INTEGER NOT NULL,
    "timeLimitSeconds" INTEGER NOT NULL,
    "sourceUnitExample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnglishQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnglishDailyCheckSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "unit" INTEGER NOT NULL,
    "dayType" "EnglishDayType" NOT NULL,
    "questionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "retentionQuestionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "EnglishSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "isFirstAttempt" BOOLEAN NOT NULL DEFAULT true,
    "totalTimeSeconds" INTEGER,
    "resultStatus" "EnglishResultStatus",
    "flagSuspicious" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EnglishDailyCheckSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnglishDailyAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selectedOptionId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeSpentSeconds" INTEGER NOT NULL,
    "belowMinTime" BOOLEAN NOT NULL DEFAULT false,
    "isRetentionQuestion" BOOLEAN NOT NULL DEFAULT false,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnglishDailyAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnglishConceptMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "masteryLevel" "EnglishMasteryLevel" NOT NULL DEFAULT 'NEW',
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),

    CONSTRAINT "EnglishConceptMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnglishKnowledgeRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "EnglishKnowledgeStatus" NOT NULL,

    CONSTRAINT "EnglishKnowledgeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnglishUnitProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unit" INTEGER NOT NULL,
    "status" "EnglishUnitStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "d1Date" TIMESTAMP(3),
    "d2Date" TIMESTAMP(3),
    "d1Result" "EnglishResultStatus",
    "d2Result" "EnglishResultStatus",

    CONSTRAINT "EnglishUnitProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnglishDailyStreak" (
    "userId" TEXT NOT NULL,
    "assessmentCurrentStreak" INTEGER NOT NULL DEFAULT 0,
    "assessmentLongestStreak" INTEGER NOT NULL DEFAULT 0,
    "assessmentLastDate" DATE,
    "learningCurrentStreak" INTEGER NOT NULL DEFAULT 0,
    "learningLongestStreak" INTEGER NOT NULL DEFAULT 0,
    "learningLastDate" DATE,

    CONSTRAINT "EnglishDailyStreak_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "EnglishConcept_unit_idx" ON "EnglishConcept"("unit");

-- CreateIndex
CREATE UNIQUE INDEX "EnglishConcept_unit_name_key" ON "EnglishConcept"("unit", "name");

-- CreateIndex
CREATE INDEX "EnglishQuestion_unit_questionType_idx" ON "EnglishQuestion"("unit", "questionType");

-- CreateIndex
CREATE INDEX "EnglishDailyCheckSession_userId_date_idx" ON "EnglishDailyCheckSession"("userId", "date");

-- CreateIndex
CREATE INDEX "EnglishDailyAnswer_sessionId_idx" ON "EnglishDailyAnswer"("sessionId");

-- CreateIndex
CREATE INDEX "EnglishDailyAnswer_userId_questionId_idx" ON "EnglishDailyAnswer"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "EnglishConceptMastery_userId_conceptId_key" ON "EnglishConceptMastery"("userId", "conceptId");

-- CreateIndex
CREATE INDEX "EnglishKnowledgeRecord_userId_conceptId_idx" ON "EnglishKnowledgeRecord"("userId", "conceptId");

-- CreateIndex
CREATE INDEX "EnglishKnowledgeRecord_userId_date_idx" ON "EnglishKnowledgeRecord"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EnglishUnitProgress_userId_unit_key" ON "EnglishUnitProgress"("userId", "unit");

