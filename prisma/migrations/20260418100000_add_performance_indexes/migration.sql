-- Repair: init snapshot lacks userId on core tables; indexes require these columns for shadow replay.

ALTER TABLE "MealEntry" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "MealEntry" ADD COLUMN IF NOT EXISTS "totalCarbs" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "MealEntry" ADD COLUMN IF NOT EXISTS "totalFat" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "MealEntry" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "MealEntry" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "MealEntry" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
ALTER TABLE "MealEntry" ALTER COLUMN "userId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MealEntry_userId_fkey') THEN
    ALTER TABLE "MealEntry" ADD CONSTRAINT "MealEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Workout" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
ALTER TABLE "Workout" ALTER COLUMN "userId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Workout_userId_fkey') THEN
    ALTER TABLE "Workout" ADD CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "WeightLog" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "WeightLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WeightLog" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WeightLog" ADD COLUMN IF NOT EXISTS "waistCm" DOUBLE PRECISION;

UPDATE "WeightLog" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
ALTER TABLE "WeightLog" ALTER COLUMN "userId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WeightLog_userId_fkey') THEN
    ALTER TABLE "WeightLog" ADD CONSTRAINT "WeightLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS "WeightLog_date_key";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WeightLog_userId_date_key') THEN
    CREATE UNIQUE INDEX "WeightLog_userId_date_key" ON "WeightLog"("userId", "date");
  END IF;
END $$;

-- Performance indexes for frequent user/date access patterns.
CREATE INDEX IF NOT EXISTS "MealTemplate_userId_createdAt_idx" ON "MealTemplate"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "MealEntry_userId_date_idx" ON "MealEntry"("userId", "date");
CREATE INDEX IF NOT EXISTS "MealEntry_userId_createdAt_idx" ON "MealEntry"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Workout_userId_date_idx" ON "Workout"("userId", "date");
CREATE INDEX IF NOT EXISTS "WeightLog_userId_createdAt_idx" ON "WeightLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "HydrationLog_userId_createdAt_idx" ON "HydrationLog"("userId", "createdAt");
