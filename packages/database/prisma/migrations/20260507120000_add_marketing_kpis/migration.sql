-- CreateTable
CREATE TABLE "marketing_kpis" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "trend" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'on-track',
    "icon" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_kpis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_kpis_category_order_idx" ON "marketing_kpis"("category", "order");
