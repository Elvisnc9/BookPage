-- Website templates (database-driven catalogue) and uploaded media.
-- Order matters: create and fill site_templates, point every business at the
-- template it was using (all were "classic"), then drop the old text column.

-- CreateTable
CREATE TABLE "site_templates" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "preview_image_url" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "supported_sections" TEXT[],
    "default_theme" JSONB NOT NULL,
    "layout_configuration" JSONB NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_templates_slug_key" ON "site_templates"("slug");

-- CreateIndex
CREATE INDEX "site_templates_is_active_position_idx" ON "site_templates"("is_active", "position");

-- Launch catalogue (generated from prisma/templates.ts, each row checked with parseTemplate)
INSERT INTO "site_templates" ("id", "slug", "name", "description", "category", "version", "is_active", "is_premium", "supported_sections", "default_theme", "layout_configuration", "schema_version", "position", "updated_at") VALUES
  ('01929b00-0000-7000-8000-000000000001', 'classic', 'Classic', 'Warm and photo-led: your name in big type, service cards and a team row. Suits most businesses.', 'beauty', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#F09C84","font":"grotesk"}'::jsonb, '{"sections":["services","gallery","team","contact","hours","faq"],"services":{"display":"cards","limit":4},"gallery":{"limit":6},"labels":{}}'::jsonb, 1, 0, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000002', 'billboard', 'Billboard', 'Your name in huge centred type over a full-width photo. For trades, barbers and anyone who wants to be seen.', 'home', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#E07A3F","font":"condensed"}'::jsonb, '{"sections":["services","gallery","hours","contact","faq"],"services":{"display":"rows","limit":8},"gallery":{"limit":4},"labels":{"services":"What we do","visit":"Get in touch"}}'::jsonb, 1, 1, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000003', 'quiet', 'Quiet', 'Text-led and calm, with a lot of space and a simple price list. For therapists, coaches and tutors.', 'professional', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#6F7D3C","font":"grotesk"}'::jsonb, '{"sections":["about","services","hours","contact","faq"],"services":{"display":"list","limit":12},"gallery":{"limit":0},"labels":{"services":"Sessions","about":"About"}}'::jsonb, 1, 2, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000004', 'journal', 'Journal', 'A magazine spread: a masthead, a big serif headline and an off-grid photo layout. For photographers and studios.', 'creative', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#141210","font":"didone"}'::jsonb, '{"sections":["about","gallery","services","team","contact","hours"],"services":{"display":"list","limit":10},"gallery":{"limit":5},"labels":{"services":"Commissions","gallery":"Selected work"}}'::jsonb, 1, 3, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000005', 'carte', 'Carte', 'A printed menu: dishes with dotted price leaders, opening hours up front and a reserve button. For restaurants and cafés.', 'food', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#D9432B","font":"didone"}'::jsonb, '{"sections":["hours","services","gallery","contact","faq"],"services":{"display":"menu","limit":24},"gallery":{"limit":3},"labels":{"services":"The menu","visit":"Find us"}}'::jsonb, 1, 4, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000006', 'shelf', 'Shelf', 'A product grid where every service is a photo card with its price. For nail bars, shops and makers.', 'retail', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#2F55D4","font":"grotesk"}'::jsonb, '{"sections":["services","gallery","contact","hours","faq"],"services":{"display":"grid","limit":12},"gallery":{"limit":4},"labels":{"services":"Shop the menu"}}'::jsonb, 1, 5, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000007', 'neighbour', 'Neighbour', 'Friendly and practical: call or book up top, the areas you cover and how booking works. For cleaners, mechanics and home services.', 'home', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#1F7A72","font":"soft"}'::jsonb, '{"sections":["services","contact","hours","team","faq"],"services":{"display":"rows","limit":8},"gallery":{"limit":3},"labels":{"services":"How we can help","visit":"Where we work"}}'::jsonb, 1, 6, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000008', 'noir', 'Noir', 'Dark, immersive and unhurried: thin rules, a light serif and your photos edge to edge. For spas and high-end studios.', 'beauty', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#D9A033","font":"didone"}'::jsonb, '{"sections":["about","services","gallery","team","hours","contact"],"services":{"display":"list","limit":10},"gallery":{"limit":4},"labels":{"services":"Treatments","about":"The house"}}'::jsonb, 1, 7, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000009', 'pulse', 'Pulse', 'Loud and high-contrast, with a week-at-a-glance timetable and sessions as bold blocks. For gyms and coaches.', 'fitness', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#C8F031","font":"condensed"}'::jsonb, '{"sections":["services","hours","team","gallery","contact"],"services":{"display":"cards","limit":6},"gallery":{"limit":4},"labels":{"services":"Sessions","team":"Coaches"}}'::jsonb, 1, 8, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000010', 'folio', 'Folio', 'Work first: a full gallery wall, one line about you and a short booking list. For artists, tattooists and portfolios.', 'creative', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#141210","font":"mono"}'::jsonb, '{"sections":["gallery","about","services","contact","hours"],"services":{"display":"rows","limit":8},"gallery":{"limit":12},"labels":{"gallery":"Work","services":"Book a slot"}}'::jsonb, 1, 9, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000011', 'practice', 'Practice', 'Structured and reassuring: services with clear durations, hours and contact side by side. For clinics and consultants.', 'professional', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#2F55D4","font":"grotesk"}'::jsonb, '{"sections":["services","team","hours","contact","faq"],"services":{"display":"list","limit":12},"gallery":{"limit":0},"labels":{"services":"Appointments","team":"Our clinicians","faq":"Before your visit"}}'::jsonb, 1, 10, CURRENT_TIMESTAMP);

-- AlterTable: the business now points at a template row and keeps its own colour/font choices.
ALTER TABLE "businesses" ADD COLUMN "template_id" UUID,
ADD COLUMN "theme" JSONB NOT NULL DEFAULT '{}';

-- Backfill: every existing business used the old text column, which only ever held "classic".
UPDATE "businesses" b SET "template_id" = t."id" FROM "site_templates" t WHERE t."slug" = b."template";
UPDATE "businesses" SET "template_id" = '01929b00-0000-7000-8000-000000000001' WHERE "template_id" IS NULL;

-- Onboarding gained a Template step in front and lost Look, so unfinished drafts move one step on:
-- old 1 About → 2, 2 Services → 3, 3 Booking → 4, 4 Look → 4. Published pages (5) and fresh drafts (0) stay.
UPDATE "businesses" SET "onboarding_step" = LEAST("onboarding_step" + 1, 4)
WHERE "published_at" IS NULL AND "onboarding_step" BETWEEN 1 AND 4;

-- logo_url was never written (there were no uploads); logos are media_assets now.
ALTER TABLE "businesses" DROP COLUMN "logo_url",
DROP COLUMN "template";

-- CreateIndex
CREATE INDEX "businesses_template_id_idx" ON "businesses"("template_id");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "site_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "media_kind" AS ENUM ('logo', 'hero', 'gallery', 'service', 'staff');

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "kind" "media_kind" NOT NULL,
    "service_id" UUID,
    "staff_id" UUID,
    "content_type" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "byte_size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_assets_business_id_kind_position_idx" ON "media_assets"("business_id", "kind", "position");

-- CreateIndex
CREATE INDEX "media_assets_service_id_idx" ON "media_assets"("service_id");

-- CreateIndex
CREATE INDEX "media_assets_staff_id_idx" ON "media_assets"("staff_id");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
