// The launch catalogue of website templates. The migration that creates
// site_templates inserted these rows; `pnpm db:seed` re-syncs them in dev.
// After launch, change templates with a migration (or an admin tool), not here:
// the database is the source of truth for what is offered.
//
// Each slug must have a renderer in apps/web/src/site/registry.ts. Rows are
// data only: section order, display options, default colours and fonts.
import type { LayoutConfig, SiteSection, SiteTheme, TemplateGroup } from '@bookpage/shared';

export interface CatalogueEntry {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: TemplateGroup;
  supportedSections: SiteSection[];
  defaultTheme: SiteTheme;
  layout: LayoutConfig;
  isPremium?: boolean;
}

const ALL: SiteSection[] = ['services', 'about', 'gallery', 'team', 'hours', 'contact', 'faq'];
const id = (n: number) => `01929b00-0000-7000-8000-${String(n).padStart(12, '0')}`;

export const TEMPLATE_CATALOGUE: CatalogueEntry[] = [
  {
    id: id(1),
    slug: 'classic',
    name: 'Classic',
    description: 'Warm and photo-led: your name in big type, service cards and a team row. Suits most businesses.',
    category: 'beauty',
    supportedSections: ALL,
    defaultTheme: { accent: '#F09C84', font: 'grotesk' },
    layout: { sections: ['services', 'gallery', 'team', 'contact', 'hours', 'faq'], services: { display: 'cards', limit: 4 }, gallery: { limit: 6 }, labels: {} },
  },
  {
    id: id(2),
    slug: 'billboard',
    name: 'Billboard',
    description: 'Your name in huge centred type over a full-width photo. For trades, barbers and anyone who wants to be seen.',
    category: 'home',
    supportedSections: ALL,
    defaultTheme: { accent: '#E07A3F', font: 'condensed' },
    layout: { sections: ['services', 'gallery', 'hours', 'contact', 'faq'], services: { display: 'rows', limit: 8 }, gallery: { limit: 4 }, labels: { services: 'What we do', visit: 'Get in touch' } },
  },
  {
    id: id(3),
    slug: 'quiet',
    name: 'Quiet',
    description: 'Text-led and calm, with a lot of space and a simple price list. For therapists, coaches and tutors.',
    category: 'professional',
    supportedSections: ALL,
    defaultTheme: { accent: '#6F7D3C', font: 'grotesk' },
    layout: { sections: ['about', 'services', 'hours', 'contact', 'faq'], services: { display: 'list', limit: 12 }, gallery: { limit: 0 }, labels: { services: 'Sessions', about: 'About' } },
  },
  {
    id: id(4),
    slug: 'journal',
    name: 'Journal',
    description: 'A magazine spread: a masthead, a big serif headline and an off-grid photo layout. For photographers and studios.',
    category: 'creative',
    supportedSections: ALL,
    defaultTheme: { accent: '#141210', font: 'didone' },
    layout: { sections: ['about', 'gallery', 'services', 'team', 'contact', 'hours'], services: { display: 'list', limit: 10 }, gallery: { limit: 5 }, labels: { services: 'Commissions', gallery: 'Selected work' } },
  },
  {
    id: id(5),
    slug: 'carte',
    name: 'Carte',
    description: 'A printed menu: dishes with dotted price leaders, opening hours up front and a reserve button. For restaurants and cafés.',
    category: 'food',
    supportedSections: ALL,
    defaultTheme: { accent: '#D9432B', font: 'didone' },
    layout: { sections: ['hours', 'services', 'gallery', 'contact', 'faq'], services: { display: 'menu', limit: 24 }, gallery: { limit: 3 }, labels: { services: 'The menu', visit: 'Find us' } },
  },
  {
    id: id(6),
    slug: 'shelf',
    name: 'Shelf',
    description: 'A product grid where every service is a photo card with its price. For nail bars, shops and makers.',
    category: 'retail',
    supportedSections: ALL,
    defaultTheme: { accent: '#2F55D4', font: 'grotesk' },
    layout: { sections: ['services', 'gallery', 'contact', 'hours', 'faq'], services: { display: 'grid', limit: 12 }, gallery: { limit: 4 }, labels: { services: 'Shop the menu' } },
  },
  {
    id: id(7),
    slug: 'neighbour',
    name: 'Neighbour',
    description: 'Friendly and practical: call or book up top, the areas you cover and how booking works. For cleaners, mechanics and home services.',
    category: 'home',
    supportedSections: ALL,
    defaultTheme: { accent: '#1F7A72', font: 'soft' },
    layout: { sections: ['services', 'contact', 'hours', 'team', 'faq'], services: { display: 'rows', limit: 8 }, gallery: { limit: 3 }, labels: { services: 'How we can help', visit: 'Where we work' } },
  },
  {
    id: id(8),
    slug: 'noir',
    name: 'Noir',
    description: 'Dark, immersive and unhurried: thin rules, a light serif and your photos edge to edge. For spas and high-end studios.',
    category: 'beauty',
    supportedSections: ALL,
    defaultTheme: { accent: '#D9A033', font: 'didone' },
    layout: { sections: ['about', 'services', 'gallery', 'team', 'hours', 'contact'], services: { display: 'list', limit: 10 }, gallery: { limit: 4 }, labels: { services: 'Treatments', about: 'The house' } },
  },
  {
    id: id(9),
    slug: 'pulse',
    name: 'Pulse',
    description: 'Loud and high-contrast, with a week-at-a-glance timetable and sessions as bold blocks. For gyms and coaches.',
    category: 'fitness',
    supportedSections: ALL,
    defaultTheme: { accent: '#C8F031', font: 'condensed' },
    layout: { sections: ['services', 'hours', 'team', 'gallery', 'contact'], services: { display: 'cards', limit: 6 }, gallery: { limit: 4 }, labels: { services: 'Sessions', team: 'Coaches' } },
  },
  {
    id: id(10),
    slug: 'folio',
    name: 'Folio',
    description: 'Work first: a full gallery wall, one line about you and a short booking list. For artists, tattooists and portfolios.',
    category: 'creative',
    supportedSections: ALL,
    defaultTheme: { accent: '#141210', font: 'mono' },
    layout: { sections: ['gallery', 'about', 'services', 'contact', 'hours'], services: { display: 'rows', limit: 8 }, gallery: { limit: 12 }, labels: { gallery: 'Work', services: 'Book a slot' } },
  },
  {
    id: id(11),
    slug: 'practice',
    name: 'Practice',
    description: 'Structured and reassuring: services with clear durations, hours and contact side by side. For clinics and consultants.',
    category: 'professional',
    supportedSections: ALL,
    defaultTheme: { accent: '#2F55D4', font: 'grotesk' },
    layout: { sections: ['services', 'team', 'hours', 'contact', 'faq'], services: { display: 'list', limit: 12 }, gallery: { limit: 0 }, labels: { services: 'Appointments', team: 'Our clinicians', faq: 'Before your visit' } },
  },
];

/** The shape Prisma writes. */
export const toRow = (t: CatalogueEntry, position: number) => ({
  id: t.id,
  slug: t.slug,
  name: t.name,
  description: t.description,
  category: t.category,
  version: 1,
  isActive: true,
  isPremium: t.isPremium ?? false,
  supportedSections: t.supportedSections,
  defaultTheme: t.defaultTheme,
  layoutConfiguration: t.layout,
  schemaVersion: 1,
  position,
});
