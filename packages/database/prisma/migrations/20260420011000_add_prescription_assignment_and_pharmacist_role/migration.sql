ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PHARMACIST';

ALTER TABLE "uploaded_prescriptions"
ADD COLUMN "assignedReviewerId" TEXT,
ADD COLUMN "assignedAt" TIMESTAMP(3);

CREATE INDEX "uploaded_prescriptions_assignedReviewerId_idx"
ON "uploaded_prescriptions"("assignedReviewerId");

ALTER TABLE "uploaded_prescriptions"
ADD CONSTRAINT "uploaded_prescriptions_assignedReviewerId_fkey"
FOREIGN KEY ("assignedReviewerId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;