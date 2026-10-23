-- Premium templates and the plan that unlocks them, plus six new templates
-- (three for restaurants and cafés, three for shops).
-- Billing isn't built yet: every business starts on "free"; Pro is set by hand
-- until checkout exists. A premium template on a free page renders Classic and
-- the owner is told why (resolveSite's "locked" notice).

-- CreateEnum
CREATE TYPE "plan" AS ENUM ('free', 'pro');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "plan" "plan" NOT NULL DEFAULT 'free';

-- Noir becomes a Pro template.
UPDATE "site_templates" SET "is_premium" = true, "updated_at" = CURRENT_TIMESTAMP WHERE "slug" = 'noir';

-- New templates (generated from prisma/templates.ts, each row checked with parseTemplate)
INSERT INTO "site_templates" ("id", "slug", "name", "description", "category", "version", "is_active", "is_premium", "supported_sections", "default_theme", "layout_configuration", "schema_version", "position", "updated_at") VALUES
  ('01929b00-0000-7000-8000-000000000012', 'bistro', 'Bistro', 'An editorial menu: a broadsheet masthead, tonight’s dishes set in two columns and the kitchen’s story beside them. For bistros and wine bars.', 'food', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#8C2F1B","font":"didone"}'::jsonb, '{"sections":["about","services","hours","gallery","contact","faq"],"services":{"display":"menu","limit":24},"gallery":{"limit":3},"labels":{"services":"On the menu","about":"The kitchen"}}'::jsonb, 1, 11, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000013', 'hatch', 'Hatch', 'Loud like a street-food stall: a menu board in huge type, prices in stickers and "order" one tap away. For takeaways, trucks and pop-ups.', 'food', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#FFD23F","font":"condensed"}'::jsonb, '{"sections":["services","hours","gallery","contact","faq"],"services":{"display":"grid","limit":12},"gallery":{"limit":4},"labels":{"services":"Order up","visit":"Find the hatch"}}'::jsonb, 1, 12, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000014', 'hearth', 'Hearth', 'Warm and homely, like the café on your corner: soft shapes, today’s bakes on cards and the people behind the counter. For cafés and bakeries.', 'food', 1, true, true, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#C8693A","font":"soft"}'::jsonb, '{"sections":["about","services","gallery","hours","team","contact","faq"],"services":{"display":"cards","limit":8},"gallery":{"limit":4},"labels":{"services":"From the counter","team":"Behind the counter"}}'::jsonb, 1, 13, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000015', 'atelier', 'Atelier', 'A quiet boutique: big product photos on white, tiny confident type and nothing in the way. For designers, makers and concept stores.', 'retail', 1, true, true, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#141210","font":"grotesk"}'::jsonb, '{"sections":["services","about","gallery","contact","hours","faq"],"services":{"display":"grid","limit":12},"gallery":{"limit":4},"labels":{"services":"The collection","about":"The studio"}}'::jsonb, 1, 14, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000016', 'stockroom', 'Stockroom', 'A product wall, floor to ceiling: dense tiles, price stickers and a bold "in stock" header. For sneaker, vintage and record shops.', 'retail', 1, true, false, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#FF5A1F","font":"condensed"}'::jsonb, '{"sections":["services","gallery","hours","contact","faq"],"services":{"display":"grid","limit":16},"gallery":{"limit":6},"labels":{"services":"In stock now"}}'::jsonb, 1, 15, CURRENT_TIMESTAMP),
  ('01929b00-0000-7000-8000-000000000017', 'bloom', 'Bloom', 'A soft lifestyle store: pastel ground, rounded product cards and a photo collage up top. For florists, candles, skincare and gifts.', 'retail', 1, true, true, ARRAY['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'], '{"accent":"#D9849C","font":"didone"}'::jsonb, '{"sections":["about","services","gallery","team","contact","hours","faq"],"services":{"display":"cards","limit":9},"gallery":{"limit":5},"labels":{"services":"Shop and book","about":"Our story"}}'::jsonb, 1, 16, CURRENT_TIMESTAMP);
