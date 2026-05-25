-- CreateEnum
CREATE TYPE "GamificationAction" AS ENUM (
  'CHEST_CLAIM',
  'BOSS_CLAIM',
  'BUY_FREEZE',
  'BUY_XP_BOOST',
  'ARM_FREEZE',
  'USE_XP_BOOST',
  'ACTIVITY_LOG',
  'XP_AWARD',
  'QUEST_XP',
  'STREAK_SYNC'
);

-- CreateTable
CREATE TABLE "UserGamification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "freezeInventory" INTEGER NOT NULL DEFAULT 0,
    "xpBoostTokens" INTEGER NOT NULL DEFAULT 0,
    "freezeArmed" BOOLEAN NOT NULL DEFAULT false,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "rank" TEXT NOT NULL DEFAULT 'Bronze I',
    "globalStreak" INTEGER NOT NULL DEFAULT 0,
    "bestGlobalStreak" INTEGER NOT NULL DEFAULT 0,
    "mealStreak" INTEGER NOT NULL DEFAULT 0,
    "workoutStreak" INTEGER NOT NULL DEFAULT 0,
    "hydrationStreak" INTEGER NOT NULL DEFAULT 0,
    "lastChestClaimedAt" TIMESTAMP(3),
    "lastBossClaimedWeek" TEXT,
    "questPayoutsByDay" JSONB NOT NULL DEFAULT '{}',
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGamification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamificationAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "GamificationAction" NOT NULL,
    "coinsDelta" INTEGER NOT NULL DEFAULT 0,
    "previousValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamificationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mealsLogged" BOOLEAN NOT NULL DEFAULT false,
    "workoutLogged" BOOLEAN NOT NULL DEFAULT false,
    "hydrationLogged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyBossLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL DEFAULT 5,
    "defeated" BOOLEAN NOT NULL DEFAULT false,
    "lootClaimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyBossLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserGamification_userId_key" ON "UserGamification"("userId");

-- CreateIndex
CREATE INDEX "GamificationAuditLog_userId_createdAt_idx" ON "GamificationAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GamificationAuditLog_userId_action_createdAt_idx" ON "GamificationAuditLog"("userId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "DailyActivityLog_userId_date_idx" ON "DailyActivityLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivityLog_userId_date_key" ON "DailyActivityLog"("userId", "date");

-- CreateIndex
CREATE INDEX "WeeklyBossLog_userId_weekKey_idx" ON "WeeklyBossLog"("userId", "weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyBossLog_userId_weekKey_key" ON "WeeklyBossLog"("userId", "weekKey");

-- AddForeignKey
ALTER TABLE "UserGamification" ADD CONSTRAINT "UserGamification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamificationAuditLog" ADD CONSTRAINT "GamificationAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActivityLog" ADD CONSTRAINT "DailyActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyBossLog" ADD CONSTRAINT "WeeklyBossLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
