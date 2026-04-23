-- CreateEnum
CREATE TYPE "PatientVerificationStatus" AS ENUM ('PENDING_OTP', 'OTP_VERIFIED', 'PROFILE_COMPLETE', 'INTAKE_COMPLETE', 'CONSENT_GIVEN', 'ID_UPLOAD_PENDING', 'ID_UNDER_REVIEW', 'ID_VERIFIED', 'CONFIRMED', 'FLAGGED', 'EMERGENCY_OVERRIDE');

-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TriageLevel" AS ENUM ('STANDARD', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "ManualReviewReason" AS ENUM ('HIGH_RISK_SCORE', 'OCR_MISMATCH', 'FACE_MATCH_FAILED', 'MINOR_PATIENT', 'PROVIDER_FLAGGED', 'SUSPICIOUS_ACTIVITY', 'EMERGENCY_OVERRIDE_REQUESTED', 'REPEAT_ADDRESS_MISMATCH');

-- CreateEnum
CREATE TYPE "ReviewPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'ESCALATED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "verificationSnapshot" JSONB;

-- AlterTable
ALTER TABLE "patient_profiles"
ADD COLUMN "flagReason" TEXT,
ADD COLUMN "flaggedBookings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "totalBookings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "trustScore" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "verificationStatus" "PatientVerificationStatus" NOT NULL DEFAULT 'PENDING_OTP';

-- CreateTable
CREATE TABLE "patient_verifications" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "PatientVerificationStatus" NOT NULL DEFAULT 'PENDING_OTP',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskTier" "RiskTier" NOT NULL DEFAULT 'LOW',
    "riskTriggers" TEXT[],
    "idType" TEXT,
    "idTokenRef" TEXT,
    "idVerifiedAt" TIMESTAMP(3),
    "idVerificationSource" TEXT,
    "ocrConfidenceScore" DOUBLE PRECISION,
    "faceMatchScore" DOUBLE PRECISION,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "guardianName" TEXT,
    "guardianRelationship" TEXT,
    "guardianPhone" TEXT,
    "guardianIdTokenRef" TEXT,
    "emergencyOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "overrideBy" TEXT,
    "overrideAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_id_documents" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "extractedName" TEXT,
    "extractedDob" TEXT,
    "extractedIdNumber" TEXT,
    "ocrRawResult" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_id_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_audit_logs" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_intakes" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "consultationReason" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "allergies" TEXT,
    "currentMedications" TEXT,
    "medicalHistory" TEXT,
    "hasPets" BOOLEAN NOT NULL DEFAULT false,
    "petType" TEXT,
    "gateCode" TEXT,
    "floorNumber" INTEGER,
    "patientAlone" BOOLEAN NOT NULL DEFAULT false,
    "mobilityConstraint" BOOLEAN NOT NULL DEFAULT false,
    "infectionRiskFlag" BOOLEAN NOT NULL DEFAULT false,
    "specialInstructions" TEXT,
    "triageLevel" "TriageLevel" NOT NULL DEFAULT 'STANDARD',
    "triageFlags" TEXT[],
    "emergencyRedirected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bookingId" TEXT,
    "consentVersion" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "deviceId" TEXT,
    "signatureArtifact" TEXT,
    "isGuardianConsent" BOOLEAN NOT NULL DEFAULT false,
    "guardianName" TEXT,
    "guardianPhone" TEXT,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_otps" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "providerLat" DOUBLE PRECISION,
    "providerLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_review_queue" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "reason" "ManualReviewReason" NOT NULL,
    "priority" "ReviewPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "ReviewStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "notes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_review_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_verifications_patientId_key" ON "patient_verifications"("patientId");

-- CreateIndex
CREATE INDEX "patient_verifications_status_idx" ON "patient_verifications"("status");

-- CreateIndex
CREATE INDEX "patient_verifications_riskTier_idx" ON "patient_verifications"("riskTier");

-- CreateIndex
CREATE INDEX "patient_id_documents_verificationId_idx" ON "patient_id_documents"("verificationId");

-- CreateIndex
CREATE INDEX "verification_audit_logs_verificationId_idx" ON "verification_audit_logs"("verificationId");

-- CreateIndex
CREATE INDEX "verification_audit_logs_createdAt_idx" ON "verification_audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_intakes_bookingId_key" ON "clinical_intakes"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "consent_records_bookingId_key" ON "consent_records"("bookingId");

-- CreateIndex
CREATE INDEX "consent_records_patientId_idx" ON "consent_records"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "visit_otps_bookingId_key" ON "visit_otps"("bookingId");

-- CreateIndex
CREATE INDEX "visit_otps_bookingId_idx" ON "visit_otps"("bookingId");

-- CreateIndex
CREATE INDEX "manual_review_queue_status_idx" ON "manual_review_queue"("status");

-- CreateIndex
CREATE INDEX "manual_review_queue_priority_idx" ON "manual_review_queue"("priority");

-- CreateIndex
CREATE INDEX "manual_review_queue_createdAt_idx" ON "manual_review_queue"("createdAt");

-- AddForeignKey
ALTER TABLE "patient_verifications" ADD CONSTRAINT "patient_verifications_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_id_documents" ADD CONSTRAINT "patient_id_documents_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "patient_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_audit_logs" ADD CONSTRAINT "verification_audit_logs_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "patient_verifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_intakes" ADD CONSTRAINT "clinical_intakes_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_otps" ADD CONSTRAINT "visit_otps_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_review_queue" ADD CONSTRAINT "manual_review_queue_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "patient_verifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;