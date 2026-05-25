-- Repair: repo `init` migration is incomplete — Prisma shadow DB replay needs User + GoalSetting
-- before this migration (production DBs that used `db push` already have these tables).

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

INSERT INTO "User" ("id", "email", "passwordHash")
SELECT 'clseed00000000000000000000000001', 'seed@shadow.replay.invalid', '$2a$10$shadowReplayPlaceholderHashNotForLogin'
WHERE NOT EXISTS (SELECT 1 FROM "User" LIMIT 1);

CREATE TABLE IF NOT EXISTS "GoalSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calorieTarget" INTEGER NOT NULL DEFAULT 1500,
    "proteinTarget" INTEGER NOT NULL DEFAULT 110,
    "carbTarget" INTEGER NOT NULL DEFAULT 180,
    "fatTarget" INTEGER NOT NULL DEFAULT 55,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderTime" TEXT NOT NULL DEFAULT '09:00',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoalSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GoalSetting_userId_key" ON "GoalSetting"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GoalSetting_userId_fkey'
  ) THEN
    ALTER TABLE "GoalSetting" ADD CONSTRAINT "GoalSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'GoalSetting' AND column_name = 'waterTargetMl'
  ) THEN
    ALTER TABLE "GoalSetting" ADD COLUMN "waterTargetMl" INTEGER NOT NULL DEFAULT 2000;
  END IF;
END $$;

-- CreateTable
CREATE TABLE "HydrationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalMl" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HydrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HydrationLog_userId_date_key" ON "HydrationLog"("userId", "date");

-- AddForeignKey
ALTER TABLE "HydrationLog" ADD CONSTRAINT "HydrationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
