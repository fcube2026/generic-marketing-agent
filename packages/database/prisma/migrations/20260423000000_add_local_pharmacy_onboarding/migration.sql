-- CreateEnum
CREATE TYPE "LocalPharmacyStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "local_pharmacies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "operatingHours" TEXT,
    "status" "LocalPharmacyStatus" NOT NULL DEFAULT 'PENDING',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "licenseVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_pharmacies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_pharmacy_inventory" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_pharmacy_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "local_pharmacies_licenseNumber_key" ON "local_pharmacies"("licenseNumber");

-- CreateIndex
CREATE INDEX "local_pharmacies_status_idx" ON "local_pharmacies"("status");

-- CreateIndex
CREATE INDEX "local_pharmacies_licenseNumber_idx" ON "local_pharmacies"("licenseNumber");

-- CreateIndex
CREATE INDEX "local_pharmacy_inventory_pharmacyId_idx" ON "local_pharmacy_inventory"("pharmacyId");

-- CreateIndex
CREATE INDEX "local_pharmacy_inventory_medicineName_idx" ON "local_pharmacy_inventory"("medicineName");

-- AddForeignKey
ALTER TABLE "local_pharmacy_inventory" ADD CONSTRAINT "local_pharmacy_inventory_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "local_pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
