-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'REUPLOAD_REQUIRED');

-- CreateEnum
CREATE TYPE "PrescriptionReviewAction" AS ENUM ('APPROVED', 'REJECTED', 'REUPLOAD');

-- CreateTable: uploaded_prescriptions
CREATE TABLE "uploaded_prescriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploaded_prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: prescription_review_logs
CREATE TABLE "prescription_review_logs" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "action" "PrescriptionReviewAction" NOT NULL,
    "performedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescription_review_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "uploaded_prescriptions_userId_idx" ON "uploaded_prescriptions"("userId");

-- CreateIndex
CREATE INDEX "uploaded_prescriptions_status_idx" ON "uploaded_prescriptions"("status");

-- CreateIndex
CREATE INDEX "uploaded_prescriptions_createdAt_idx" ON "uploaded_prescriptions"("createdAt");

-- CreateIndex
CREATE INDEX "prescription_review_logs_prescriptionId_idx" ON "prescription_review_logs"("prescriptionId");

-- AddForeignKey
ALTER TABLE "uploaded_prescriptions" ADD CONSTRAINT "uploaded_prescriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_review_logs" ADD CONSTRAINT "prescription_review_logs_prescriptionId_fkey"
    FOREIGN KEY ("prescriptionId") REFERENCES "uploaded_prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
