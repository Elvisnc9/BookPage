-- Pro billing (provider-neutral): subscription state and the owner's domain on the
-- business, checkout sessions, and a log of payment events applied exactly once.

-- CreateEnum
CREATE TYPE "billing_status" AS ENUM ('none', 'active', 'canceling', 'past_due');

-- CreateEnum
CREATE TYPE "domain_status" AS ENUM ('none', 'pending', 'active', 'failed');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "billing_status" "billing_status" NOT NULL DEFAULT 'none',
ADD COLUMN     "custom_domain" TEXT,
ADD COLUMN     "domain_mode" TEXT,
ADD COLUMN     "domain_status" "domain_status" NOT NULL DEFAULT 'none',
ADD COLUMN     "plan_renews_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "checkout_sessions" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "amount_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "domain_name" TEXT,
    "domain_mode" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(3),

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "business_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checkout_sessions_business_id_created_at_idx" ON "checkout_sessions"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "billing_events_business_id_idx" ON "billing_events"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_events_provider_external_id_key" ON "billing_events"("provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_custom_domain_key" ON "businesses"("custom_domain");

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

