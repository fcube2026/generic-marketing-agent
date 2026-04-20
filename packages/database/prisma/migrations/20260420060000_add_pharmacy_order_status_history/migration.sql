-- CreateTable
CREATE TABLE "pharmacy_order_status_history" (
    "id" TEXT NOT NULL,
    "pharmacyOrderId" TEXT NOT NULL,
    "status" "PharmacyOrderStatus" NOT NULL,
    "source" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pharmacy_order_status_history_pharmacyOrderId_idx" ON "pharmacy_order_status_history"("pharmacyOrderId");

-- CreateIndex
CREATE INDEX "pharmacy_order_status_history_timestamp_idx" ON "pharmacy_order_status_history"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_order_status_history_pharmacyOrderId_status_key" ON "pharmacy_order_status_history"("pharmacyOrderId", "status");

-- AddForeignKey
ALTER TABLE "pharmacy_order_status_history" ADD CONSTRAINT "pharmacy_order_status_history_pharmacyOrderId_fkey" FOREIGN KEY ("pharmacyOrderId") REFERENCES "pharmacy_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
