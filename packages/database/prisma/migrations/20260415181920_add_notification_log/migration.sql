-- Add whatsappEnabled to notification_preferences
ALTER TABLE "notification_preferences" ADD COLUMN "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Create notification channel enum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'SMS', 'WHATSAPP', 'EMAIL');

-- Create notification delivery status enum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'FALLBACK_TRIGGERED');

-- Create notification_logs table
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for notification_logs
CREATE INDEX "notification_logs_userId_idx" ON "notification_logs"("userId");
CREATE INDEX "notification_logs_idempotencyKey_idx" ON "notification_logs"("idempotencyKey");
CREATE INDEX "notification_logs_channel_status_idx" ON "notification_logs"("channel", "status");
CREATE INDEX "notification_logs_createdAt_idx" ON "notification_logs"("createdAt");

-- Add foreign key constraint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
