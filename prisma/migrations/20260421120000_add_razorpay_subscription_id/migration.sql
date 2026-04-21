-- Add Razorpay subscription mapping for webhook reconciliation.
ALTER TABLE "User"
ADD COLUMN "razorpaySubscriptionId" TEXT;

CREATE UNIQUE INDEX "User_razorpaySubscriptionId_key" ON "User"("razorpaySubscriptionId");
