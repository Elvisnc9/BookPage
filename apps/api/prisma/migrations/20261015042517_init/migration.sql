-- Needed so the overlap guard can combine "same staff" (=) with "times overlap" (&&).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
CREATE TYPE "location_type" AS ENUM ('premises', 'mobile', 'both', 'online');

-- CreateEnum
CREATE TYPE "hours_kind" AS ENUM ('opening', 'booking');

-- CreateEnum
CREATE TYPE "price_type" AS ENUM ('fixed', 'from', 'quote', 'free');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');

-- CreateEnum
CREATE TYPE "booking_source" AS ENUM ('page', 'owner');

-- CreateEnum
CREATE TYPE "enquiry_status" AS ENUM ('new', 'replied', 'closed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "google_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "location_type" "location_type" NOT NULL DEFAULT 'premises',
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postal_code" TEXT,
    "country" CHAR(2) NOT NULL DEFAULT 'US',
    "service_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "logo_url" TEXT,
    "template" TEXT NOT NULL DEFAULT 'classic',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opening_hours" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "kind" "hours_kind" NOT NULL DEFAULT 'opening',
    "weekday" INTEGER NOT NULL,
    "opens_at" INTEGER NOT NULL,
    "closes_at" INTEGER NOT NULL,

    CONSTRAINT "opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_type" "price_type" NOT NULL DEFAULT 'fixed',
    "price_minor" INTEGER,
    "duration_min" INTEGER NOT NULL,
    "buffer_min" INTEGER NOT NULL DEFAULT 0,
    "bookable" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_services" (
    "staff_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,

    CONSTRAINT "staff_services_pkey" PRIMARY KEY ("staff_id","service_id")
);

-- CreateTable
CREATE TABLE "booking_rules" (
    "business_id" UUID NOT NULL,
    "use_opening_hours" BOOLEAN NOT NULL DEFAULT true,
    "min_notice_min" INTEGER NOT NULL DEFAULT 120,
    "window_days" INTEGER NOT NULL DEFAULT 60,
    "slot_step_min" INTEGER NOT NULL DEFAULT 15,
    "auto_confirm" BOOLEAN NOT NULL DEFAULT true,
    "customer_fields" JSONB NOT NULL DEFAULT '{"phone":"required","email":"required","note":"optional"}',
    "alert_channels" TEXT[] DEFAULT ARRAY['email']::TEXT[],
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "booking_rules_pkey" PRIMARY KEY ("business_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "reminders_consent_at" TIMESTAMPTZ(3),
    "anonymized_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'confirmed',
    "source" "booking_source" NOT NULL DEFAULT 'page',
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "blocked_until" TIMESTAMPTZ(3) NOT NULL,
    "service_name" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "price_type" "price_type" NOT NULL,
    "price_minor" INTEGER,
    "currency" CHAR(3) NOT NULL,
    "customer_note" TEXT,
    "manage_token_hash" TEXT,
    "reminder_sent_at" TIMESTAMPTZ(3),
    "confirmed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "service_id" UUID,
    "customer_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "preferred_date" DATE,
    "status" "enquiry_status" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");

-- CreateIndex
CREATE INDEX "businesses_owner_id_idx" ON "businesses"("owner_id");

-- CreateIndex
CREATE INDEX "opening_hours_business_id_kind_weekday_idx" ON "opening_hours"("business_id", "kind", "weekday");

-- CreateIndex
CREATE INDEX "services_business_id_position_idx" ON "services"("business_id", "position");

-- CreateIndex
CREATE INDEX "staff_business_id_idx" ON "staff"("business_id");

-- CreateIndex
CREATE INDEX "staff_services_service_id_idx" ON "staff_services"("service_id");

-- CreateIndex
CREATE INDEX "customers_business_id_phone_idx" ON "customers"("business_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_business_id_email_key" ON "customers"("business_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_manage_token_hash_key" ON "bookings"("manage_token_hash");

-- CreateIndex
CREATE INDEX "bookings_business_id_starts_at_idx" ON "bookings"("business_id", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_staff_id_starts_at_idx" ON "bookings"("staff_id", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_customer_id_idx" ON "bookings"("customer_id");

-- CreateIndex
CREATE INDEX "bookings_status_starts_at_idx" ON "bookings"("status", "starts_at");

-- CreateIndex
CREATE INDEX "enquiries_business_id_status_created_at_idx" ON "enquiries"("business_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "faqs_business_id_position_idx" ON "faqs"("business_id", "position");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_rules" ADD CONSTRAINT "booking_rules_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Hand-written: rules Prisma can't express ──────────────────────────────

-- The double-booking guard. Two pending/confirmed bookings for the same staff
-- member can never overlap on [starts_at, blocked_until). A concurrent insert
-- that would overlap fails with SQLSTATE 23P01 (exclusion_violation).
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    "staff_id" WITH =,
    tstzrange("starts_at", "blocked_until", '[)') WITH &&
  ) WHERE ("status" IN ('pending', 'confirmed'));

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_times_ordered"
  CHECK ("starts_at" < "ends_at" AND "ends_at" <= "blocked_until");

ALTER TABLE "opening_hours"
  ADD CONSTRAINT "opening_hours_range_valid"
  CHECK ("weekday" BETWEEN 1 AND 7 AND "opens_at" >= 0 AND "opens_at" < "closes_at" AND "closes_at" <= 1440);

ALTER TABLE "services"
  ADD CONSTRAINT "services_numbers_valid"
  CHECK ("duration_min" > 0 AND "buffer_min" >= 0 AND ("price_minor" IS NULL OR "price_minor" >= 0));

ALTER TABLE "services"
  ADD CONSTRAINT "services_price_matches_type"
  CHECK (("price_type" IN ('fixed', 'from')) = ("price_minor" IS NOT NULL));

-- Same format as isValidSlug() in @bookpage/shared (reserved names are checked in the app).
ALTER TABLE "businesses"
  ADD CONSTRAINT "businesses_slug_format"
  CHECK ("slug" ~ '^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,39}$');

ALTER TABLE "booking_rules"
  ADD CONSTRAINT "booking_rules_numbers_valid"
  CHECK ("min_notice_min" >= 0 AND "window_days" BETWEEN 1 AND 365 AND "slot_step_min" BETWEEN 5 AND 240);

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_email_lowercase"
  CHECK ("email" IS NULL OR "email" = lower("email"));
