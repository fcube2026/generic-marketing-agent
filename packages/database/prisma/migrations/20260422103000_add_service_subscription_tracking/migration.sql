CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIAL', 'PAUSED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "SubscriptionBillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME');
CREATE TYPE "SubscriptionCategory" AS ENUM (
  'INFRASTRUCTURE',
  'AI',
  'COMMUNICATION',
  'VERIFICATION',
  'DEV_TOOLS',
  'PHARMACY',
  'OTHER'
);

CREATE TABLE "service_subscriptions" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "category" "SubscriptionCategory" NOT NULL DEFAULT 'OTHER',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "billingCycle" "SubscriptionBillingCycle" NOT NULL DEFAULT 'MONTHLY',
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "plannedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "actualAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "usageLimit" DOUBLE PRECISION,
  "usageConsumed" DOUBLE PRECISION,
  "usageUnit" TEXT,
  "seatsPlanned" INTEGER,
  "seatsUsed" INTEGER,
  "planStartDate" TIMESTAMP(3),
  "planEndDate" TIMESTAMP(3),
  "renewalDate" TIMESTAMP(3),
  "reminderDays" INTEGER NOT NULL DEFAULT 7,
  "alertEmail" TEXT,
  "notes" TEXT,
  "lastReminderSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "service_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscription_usage_logs" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "plannedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "actualAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "usageLimit" DOUBLE PRECISION,
  "usageConsumed" DOUBLE PRECISION,
  "usageUnit" TEXT,
  "seatsPlanned" INTEGER,
  "seatsUsed" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscription_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_subscriptions_status_idx" ON "service_subscriptions"("status");
CREATE INDEX "service_subscriptions_renewalDate_idx" ON "service_subscriptions"("renewalDate");
CREATE INDEX "service_subscriptions_planEndDate_idx" ON "service_subscriptions"("planEndDate");
CREATE INDEX "subscription_usage_logs_subscriptionId_idx" ON "subscription_usage_logs"("subscriptionId");
CREATE INDEX "subscription_usage_logs_periodStart_idx" ON "subscription_usage_logs"("periodStart");

ALTER TABLE "subscription_usage_logs"
ADD CONSTRAINT "subscription_usage_logs_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "service_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
