-- Add ownership and metadata to meal templates.
ALTER TABLE "MealTemplate"
ADD COLUMN "userId" TEXT,
ADD COLUMN "mealType" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing templates to the oldest user where possible.
UPDATE "MealTemplate"
SET "userId" = (
  SELECT "id"
  FROM "User"
  ORDER BY "createdAt" ASC
  LIMIT 1
)
WHERE "userId" IS NULL;

ALTER TABLE "MealTemplate"
ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "MealTemplate"
ADD CONSTRAINT "MealTemplate_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Create persistent AI meal estimate history.
CREATE TABLE "MealEstimate" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "calories" DOUBLE PRECISION NOT NULL,
  "protein" DOUBLE PRECISION NOT NULL,
  "carbs" DOUBLE PRECISION NOT NULL,
  "fat" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "source" TEXT NOT NULL DEFAULT 'camera',
  "imageName" TEXT,
  "imageMimeType" TEXT,
  "linkedMealEntryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MealEstimate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MealEntry"
ADD COLUMN "estimateId" TEXT;

CREATE INDEX "MealEstimate_userId_createdAt_idx" ON "MealEstimate"("userId", "createdAt");

ALTER TABLE "MealEstimate"
ADD CONSTRAINT "MealEstimate_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MealEstimate"
ADD CONSTRAINT "MealEstimate_linkedMealEntryId_fkey"
FOREIGN KEY ("linkedMealEntryId") REFERENCES "MealEntry"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
