-- Performance indexes for frequent user/date access patterns.
CREATE INDEX IF NOT EXISTS "MealTemplate_userId_createdAt_idx" ON "MealTemplate"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "MealEntry_userId_date_idx" ON "MealEntry"("userId", "date");
CREATE INDEX IF NOT EXISTS "MealEntry_userId_createdAt_idx" ON "MealEntry"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Workout_userId_date_idx" ON "Workout"("userId", "date");
CREATE INDEX IF NOT EXISTS "WeightLog_userId_createdAt_idx" ON "WeightLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "HydrationLog_userId_createdAt_idx" ON "HydrationLog"("userId", "createdAt");
