-- CreateTable
CREATE TABLE "WorkoutLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workoutName" TEXT NOT NULL,
    "workoutType" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "caloriesBurned" INTEGER NOT NULL,
    "workoutDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workoutType" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "caloriesBurned" INTEGER NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutLog_userId_workoutDate_idx" ON "WorkoutLog"("userId", "workoutDate");

-- CreateIndex
CREATE INDEX "WorkoutLog_userId_createdAt_idx" ON "WorkoutLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_userId_useCount_idx" ON "WorkoutTemplate"("userId", "useCount");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_userId_createdAt_idx" ON "WorkoutTemplate"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
