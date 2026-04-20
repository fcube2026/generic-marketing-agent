ALTER TABLE "pharmacy_orders"
ADD COLUMN "uploadedPrescriptionId" TEXT;

CREATE INDEX "pharmacy_orders_uploadedPrescriptionId_idx"
ON "pharmacy_orders"("uploadedPrescriptionId");

ALTER TABLE "pharmacy_orders"
ADD CONSTRAINT "pharmacy_orders_uploadedPrescriptionId_fkey"
FOREIGN KEY ("uploadedPrescriptionId") REFERENCES "uploaded_prescriptions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;