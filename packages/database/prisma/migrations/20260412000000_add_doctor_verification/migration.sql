-- AlterTable: add NMC verification tracking fields to provider_licenses
ALTER TABLE "provider_licenses" ADD COLUMN     "nmcRegistrationNumber" TEXT;
ALTER TABLE "provider_licenses" ADD COLUMN     "stateCouncil" TEXT;
ALTER TABLE "provider_licenses" ADD COLUMN     "yearOfAdmission" TEXT;
ALTER TABLE "provider_licenses" ADD COLUMN     "verificationSource" TEXT;
ALTER TABLE "provider_licenses" ADD COLUMN     "verificationAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "provider_licenses" ADD COLUMN     "lastAttemptAt" TIMESTAMP(3);
ALTER TABLE "provider_licenses" ADD COLUMN     "nextReverificationDue" TIMESTAMP(3);

-- CreateTable: audit log for every NMC verification API call
CREATE TABLE "doctor_verification_logs" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "licenseId" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "stateCouncil" TEXT NOT NULL,
    "verificationSource" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rawRequest" JSONB,
    "rawResponse" JSONB,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "doctor_verification_logs_providerId_idx" ON "doctor_verification_logs"("providerId");

-- CreateIndex
CREATE INDEX "doctor_verification_logs_createdAt_idx" ON "doctor_verification_logs"("createdAt");

-- CreateIndex: composite index for queries that filter by provider and sort by date
CREATE INDEX "doctor_verification_logs_providerId_createdAt_idx" ON "doctor_verification_logs"("providerId", "createdAt");

-- AddForeignKey
ALTER TABLE "doctor_verification_logs" ADD CONSTRAINT "doctor_verification_logs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_verification_logs" ADD CONSTRAINT "doctor_verification_logs_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "provider_licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
