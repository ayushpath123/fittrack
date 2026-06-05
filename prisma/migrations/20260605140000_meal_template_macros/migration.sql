-- Add flat macro fields and usage tracking to MealTemplate
ALTER TABLE "MealTemplate" ADD COLUMN "calories" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "MealTemplate" ADD COLUMN "protein" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "MealTemplate" ADD COLUMN "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "MealTemplate" ADD COLUMN "fat" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "MealTemplate" ADD COLUMN "useCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MealTemplate" ADD COLUMN "lastUsedAt" TIMESTAMP(3);

-- Migrate macro-only templates from legacy items JSON
UPDATE "MealTemplate"
SET
  "calories" = COALESCE((items->0->>'calories')::double precision, 0),
  "protein" = COALESCE((items->0->>'protein')::double precision, 0),
  "carbs" = COALESCE((items->0->>'carbs')::double precision, 0),
  "fat" = COALESCE((items->0->>'fat')::double precision, 0)
WHERE items IS NOT NULL
  AND jsonb_typeof(items::jsonb) = 'array'
  AND jsonb_array_length(items::jsonb) > 0
  AND (items->0->>'kind') = 'macros';

-- Normalize meal types
UPDATE "MealTemplate"
SET "mealType" = LOWER(TRIM("mealType"))
WHERE "mealType" IS NOT NULL;

UPDATE "MealTemplate"
SET "mealType" = 'snack'
WHERE "mealType" IS NULL
   OR "mealType" NOT IN ('breakfast', 'lunch', 'dinner', 'snack');

UPDATE "MealTemplate"
SET "mealType" = 'snack'
WHERE LOWER("mealType") IN ('pre-workout', 'post-workout');

-- Make mealType required
ALTER TABLE "MealTemplate" ALTER COLUMN "mealType" SET NOT NULL;

-- Make legacy items optional
ALTER TABLE "MealTemplate" ALTER COLUMN "items" DROP NOT NULL;

-- Indexes for filtering and frequently-used sorting
CREATE INDEX "MealTemplate_userId_mealType_idx" ON "MealTemplate"("userId", "mealType");
CREATE INDEX "MealTemplate_userId_useCount_idx" ON "MealTemplate"("userId", "useCount");
