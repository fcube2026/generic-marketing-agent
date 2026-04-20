-- CreateTable
CREATE TABLE "marketing_business_profiles" (
    "id" TEXT NOT NULL,
    "primaryGrowthFocus" TEXT NOT NULL DEFAULT 'both',
    "biggestBottleneck" TEXT NOT NULL DEFAULT 'demand',
    "monthlyBudget" INTEGER NOT NULL DEFAULT 0,
    "allocatedBudget" INTEGER NOT NULL DEFAULT 0,
    "targetCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bestPerforming" TEXT NOT NULL DEFAULT '',
    "topPatientPersona" TEXT NOT NULL DEFAULT '',
    "topReasonPatientChooses" TEXT NOT NULL DEFAULT '',
    "topReasonProviderJoins" TEXT NOT NULL DEFAULT '',
    "competitors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "founderLedBrand" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "budget" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "kpi" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "headline" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_campaigns_status_idx" ON "marketing_campaigns"("status");

-- CreateTable
CREATE TABLE "marketing_experiments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "control" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "result" TEXT,
    "winner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "lift" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_experiments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_experiments_status_idx" ON "marketing_experiments"("status");

-- CreateTable
CREATE TABLE "marketing_content_items" (
    "id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_content_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_content_items_week_idx" ON "marketing_content_items"("week");

-- CreateIndex
CREATE INDEX "marketing_content_items_status_idx" ON "marketing_content_items"("status");

-- CreateTable
CREATE TABLE "marketing_seo_pages" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "targetKeyword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_seo_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketing_seo_pages_url_key" ON "marketing_seo_pages"("url");

-- CreateTable
CREATE TABLE "marketing_keyword_clusters" (
    "id" TEXT NOT NULL,
    "cluster" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_keyword_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_lifecycle_flows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_lifecycle_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_lifecycle_steps" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "marketing_lifecycle_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_lifecycle_steps_flowId_idx" ON "marketing_lifecycle_steps"("flowId");

-- AddForeignKey
ALTER TABLE "marketing_lifecycle_steps" ADD CONSTRAINT "marketing_lifecycle_steps_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "marketing_lifecycle_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "marketing_plan_items" (
    "id" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_plan_items_phase_idx" ON "marketing_plan_items"("phase");

-- CreateTable
CREATE TABLE "marketing_intake_responses" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_intake_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketing_intake_responses_questionId_key" ON "marketing_intake_responses"("questionId");
