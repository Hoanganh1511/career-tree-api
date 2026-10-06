-- CreateTable
CREATE TABLE IF NOT EXISTS "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "seriesSlug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "quoteText" TEXT,
    "quotePrefix" TEXT,
    "quoteSuffix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Note_userId_entryId_idx" ON "Note"("userId", "entryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Note_userId_seriesSlug_idx" ON "Note"("userId", "seriesSlug");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Note" ADD CONSTRAINT "Note_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "ContentSeriesEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
