-- Global monthly XP ladder + optional public display name
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "leaderboardAlias" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "leaderboardPublic" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonKey" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeaderboardEntry_userId_seasonKey_key" ON "LeaderboardEntry"("userId", "seasonKey");
CREATE INDEX IF NOT EXISTS "LeaderboardEntry_seasonKey_xp_idx" ON "LeaderboardEntry"("seasonKey", "xp");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeaderboardEntry_userId_fkey') THEN
    ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
