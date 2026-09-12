
-- CreateTable
CREATE TABLE "ContentSeries" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorAvatarUrl" TEXT,
    "emailCourseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailCourseTitle" TEXT,
    "emailCourseDescription" TEXT,
    "stats" JSONB NOT NULL DEFAULT '[]',
    "installTabs" JSONB NOT NULL DEFAULT '[]',
    "externalLinks" JSONB NOT NULL DEFAULT '[]',
    "shareChannels" TEXT[] DEFAULT ARRAY['x', 'bluesky', 'linkedin', 'copy']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentSeriesCategory" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "parentId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "colorHex" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSeriesCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentSeriesEntry" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "icon" TEXT,
    "source" TEXT,
    "contentMarkdown" TEXT NOT NULL,
    "installTabs" JSONB,
    "faq" JSONB,
    "readTimeMinutes" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSeriesEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentSeries_slug_key" ON "ContentSeries"("slug");

-- CreateIndex
CREATE INDEX "ContentSeriesCategory_seriesId_orderIndex_idx" ON "ContentSeriesCategory"("seriesId", "orderIndex");

-- CreateIndex
CREATE INDEX "ContentSeriesCategory_parentId_idx" ON "ContentSeriesCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentSeriesCategory_seriesId_slug_key" ON "ContentSeriesCategory"("seriesId", "slug");

-- CreateIndex
CREATE INDEX "ContentSeriesEntry_seriesId_orderIndex_idx" ON "ContentSeriesEntry"("seriesId", "orderIndex");

-- CreateIndex
CREATE INDEX "ContentSeriesEntry_categoryId_idx" ON "ContentSeriesEntry"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentSeriesEntry_seriesId_slug_key" ON "ContentSeriesEntry"("seriesId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ContentSeriesEntry_seriesId_orderIndex_key" ON "ContentSeriesEntry"("seriesId", "orderIndex");

-- AddForeignKey
ALTER TABLE "ContentSeriesCategory" ADD CONSTRAINT "ContentSeriesCategory_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ContentSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSeriesCategory" ADD CONSTRAINT "ContentSeriesCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ContentSeriesCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSeriesEntry" ADD CONSTRAINT "ContentSeriesEntry_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ContentSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSeriesEntry" ADD CONSTRAINT "ContentSeriesEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContentSeriesCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

