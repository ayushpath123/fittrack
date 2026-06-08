-- AlterTable
ALTER TABLE "WorkoutLog" ADD COLUMN "templateId" TEXT,
ADD COLUMN "exercises" JSONB;

-- AlterTable
ALTER TABLE "WorkoutTemplate" ADD COLUMN "description" TEXT,
ADD COLUMN "icon" TEXT,
ADD COLUMN "colorTheme" TEXT,
ADD COLUMN "intensityLevel" TEXT,
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'strength',
ADD COLUMN "exercises" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "cardioType" TEXT,
ADD COLUMN "cardioDistance" DOUBLE PRECISION,
ADD COLUMN "cardioPace" TEXT,
ADD COLUMN "heartRate" INTEGER,
ADD COLUMN "builtinKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutTemplate_userId_builtinKey_key" ON "WorkoutTemplate"("userId", "builtinKey");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_userId_category_idx" ON "WorkoutTemplate"("userId", "category");
