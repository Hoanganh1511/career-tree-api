-- [2026-10-15] English Learner - toan bo bang MOI cho dich vu hoc tieng Anh
-- (Course->Unit->Section->Lesson->Concept->Exercise). Viet tay (khong qua
-- `prisma migrate dev`) vi DB hien co drift tu lau o cac bang KHONG lien
-- quan (ContentSeries/ContentSeriesEntry/Message - da ghi nhan tu cac lan
-- migrate truoc) khien `migrate dev` doi RESET toan bo schema - KHONG duoc
-- phep (se xoa du lieu cac module khac). Migration nay CHI tao bang/enum
-- MOI, khong dung cham bang nao da ton tai, nen IF NOT EXISTS/idempotent la
-- du an toan de ap truc tiep qua `migrate deploy`.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ElUnitType" AS ENUM ('GRAMMAR', 'VOCABULARY', 'MIXED', 'REVIEW', 'PROGRESS_TEST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ElSectionType" AS ENUM ('GRAMMAR_EXPLANATION', 'VOCAB_CONTRAST', 'PHRASAL_VERBS', 'COLLOCATIONS', 'WORD_PATTERNS', 'WORD_FORMATION', 'MIXED_PRACTICE', 'REVIEW', 'APPLICATION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ElConceptType" AS ENUM ('GRAMMAR', 'VOCABULARY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ElExerciseType" AS ENUM ('MULTIPLE_CHOICE', 'GAP_FILL', 'SENTENCE_TRANSFORMATION', 'ERROR_CORRECTION', 'MATCHING', 'WORD_FORMATION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ElDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ElAttemptContext" AS ENUM ('PRACTICE', 'UNIT_TEST', 'REVIEW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ElProgressEntityType" AS ENUM ('COURSE', 'UNIT', 'SECTION', 'LESSON', 'CONCEPT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ElProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVIEW', 'MASTERED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ElCourse" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "objectives" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElCourse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ElCourse_slug_key" ON "ElCourse"("slug");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ElUnit" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ElUnitType" NOT NULL,
    "topic" TEXT,
    "description" TEXT,
    "objectives" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "estimatedMinutes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ElUnit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ElUnit_courseId_slug_key" ON "ElUnit"("courseId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "ElUnit_courseId_number_key" ON "ElUnit"("courseId", "number");
CREATE INDEX IF NOT EXISTS "ElUnit_courseId_sortOrder_idx" ON "ElUnit"("courseId", "sortOrder");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ElSection" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ElSectionType" NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ElSection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ElSection_unitId_slug_key" ON "ElSection"("unitId", "slug");
CREATE INDEX IF NOT EXISTS "ElSection_unitId_sortOrder_idx" ON "ElSection"("unitId", "sortOrder");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ElLesson" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objectives" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ElLesson_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ElLesson_sectionId_slug_key" ON "ElLesson"("sectionId", "slug");
CREATE INDEX IF NOT EXISTS "ElLesson_sectionId_sortOrder_idx" ON "ElLesson"("sectionId", "sortOrder");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ElConcept" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "type" "ElConceptType" NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT,
    "formula" TEXT,
    "examples" JSONB,
    "commonMistakes" JSONB,
    "usageNotes" JSONB,
    "relatedConceptIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ElConcept_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ElConcept_lessonId_sortOrder_idx" ON "ElConcept"("lessonId", "sortOrder");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ElVocabularyItem" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "partOfSpeech" TEXT,
    "meaningVi" TEXT NOT NULL,
    "definitionEn" TEXT,
    "ipa" TEXT,
    "audioUrl" TEXT,
    "examples" JSONB,
    "collocations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "wordPatterns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "wordFamily" JSONB,
    "confusableTerms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ElVocabularyItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ElVocabularyItem_conceptId_sortOrder_idx" ON "ElVocabularyItem"("conceptId", "sortOrder");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ElExercise" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "type" "ElExerciseType" NOT NULL,
    "instruction" TEXT NOT NULL,
    "prompt" JSONB NOT NULL,
    "options" JSONB,
    "answerConfig" JSONB NOT NULL,
    "explanation" TEXT,
    "difficulty" "ElDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "points" INTEGER NOT NULL DEFAULT 1,
    "hint" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElExercise_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ElExercise_conceptId_sortOrder_idx" ON "ElExercise"("conceptId", "sortOrder");
CREATE INDEX IF NOT EXISTS "ElExercise_unitId_idx" ON "ElExercise"("unitId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ElExerciseAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "submittedAnswer" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "score" INTEGER NOT NULL,
    "context" "ElAttemptContext" NOT NULL DEFAULT 'PRACTICE',
    "reviewId" TEXT,
    "durationMs" INTEGER,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElExerciseAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ElExerciseAttempt_userId_exerciseId_attemptedAt_idx" ON "ElExerciseAttempt"("userId", "exerciseId", "attemptedAt");
CREATE INDEX IF NOT EXISTS "ElExerciseAttempt_userId_isCorrect_attemptedAt_idx" ON "ElExerciseAttempt"("userId", "isCorrect", "attemptedAt");
CREATE INDEX IF NOT EXISTS "ElExerciseAttempt_userId_context_idx" ON "ElExerciseAttempt"("userId", "context");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ElLearningProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" "ElProgressEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "ElProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElLearningProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ElLearningProgress_userId_entityType_entityId_key" ON "ElLearningProgress"("userId", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "ElLearningProgress_userId_entityType_idx" ON "ElLearningProgress"("userId", "entityType");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ElReview" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coveredUnitIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "exerciseIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElReview_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (idempotent - ADD CONSTRAINT khong co IF NOT EXISTS, bat loi
-- duplicate_object neu chay lai).
DO $$ BEGIN
  ALTER TABLE "ElUnit" ADD CONSTRAINT "ElUnit_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "ElCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ElSection" ADD CONSTRAINT "ElSection_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ElUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ElLesson" ADD CONSTRAINT "ElLesson_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ElSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ElConcept" ADD CONSTRAINT "ElConcept_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ElLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ElVocabularyItem" ADD CONSTRAINT "ElVocabularyItem_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "ElConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ElExercise" ADD CONSTRAINT "ElExercise_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "ElConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ElExercise" ADD CONSTRAINT "ElExercise_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ElUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ElExerciseAttempt" ADD CONSTRAINT "ElExerciseAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "ElExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ElExerciseAttempt" ADD CONSTRAINT "ElExerciseAttempt_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ElReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ElReview" ADD CONSTRAINT "ElReview_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "ElCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
