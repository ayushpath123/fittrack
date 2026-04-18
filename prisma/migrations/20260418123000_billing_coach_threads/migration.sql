-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('free', 'pro');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'free';
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionCurrentPeriodEnd" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- CreateTable
CREATE TABLE "CoachThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CoachThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoachMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoachThread_userId_updatedAt_idx" ON "CoachThread"("userId", "updatedAt");

CREATE INDEX "CoachMessage_threadId_createdAt_idx" ON "CoachMessage"("threadId", "createdAt");

ALTER TABLE "CoachThread" ADD CONSTRAINT "CoachThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CoachThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
