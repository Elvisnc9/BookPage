// Sample businesses for the template gallery cards. Each card renders the real
// template component with one of these, so the thumbnail is the template itself,
// not a screenshot that can drift. Photos are self-hosted Unsplash images
// (public/samples, Unsplash License) and only ever appear in the gallery.
import type { PublicBusiness, ResolvedSite, SiteImage, SiteTemplate } from '@bookpage/shared';

const img = (name: string): SiteImage => ({ id: `sample-${name}`, url: `/samples/${name}.webp`, width: 900, height: 600 });
const WEEK = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: 540, closesAt: weekday === 6 ? 960 : 1140 }));

interface Sample {
  name: string;
  category: string;
  description: string;
  city: string;
  hero: string | null;
  gallery: string[];
  services: [name: string, minor: number | null, minutes: number, photo?: string | undefined, description?: string | undefined][];
  staff: [name: string, photo?: string | undefined][];
}

const SAMPLES: Record<string, Sample> = {
  classic: {
    name: 'Glow Studio', category: 'hair_salon', description: 'Silk presses, braids and colour in a calm little studio.', city: 'Brooklyn',
    hero: 'portrait-pink', gallery: ['salon'],
    services: [['Silk press', 8500, 90, 'hair'], ['Gel manicure', 4500, 60, 'nails'], ['Facial', 9000, 60, 'spa-still'], ['Skin consult', 0, 30, 'skincare']],
    staff: [['Maya'], ['Jordan']],
  },
  billboard: {
    name: 'Brick & Blade', category: 'barber', description: 'Fades, beards and hot towel shaves. Walk in or book a chair.', city: 'Manchester',
    hero: 'barbershop', gallery: ['barber-shave', 'barbershop', 'site-aerial', 'electrician'],
    services: [['Skin fade', 2800, 45], ['Beard sculpt', 1800, 30], ['Hot towel shave', 2500, 40], ['Cut & beard', 4000, 60]],
    staff: [['Dev'], ['Sol']],
  },
  quiet: {
    name: 'Ana Ruiz Therapy', category: 'clinic', description: 'Counselling for anxiety, burnout and change. In person in Lisbon or online.', city: 'Lisbon',
    hero: 'calm-room', gallery: [],
    services: [['First conversation', 0, 20, undefined, 'A free call to see if we are a good fit'], ['Individual session', 7000, 50], ['Couples session', 9500, 75]],
    staff: [['Ana Ruiz']],
  },
  journal: {
    name: 'Ostra Studio', category: 'photography', description: 'Portraits and still life, made slowly, printed by hand.', city: 'Copenhagen',
    hero: 'photographer', gallery: ['camera-prints', 'camera-lenses', 'yoga-dusk', 'terrace', 'food-table'],
    services: [['Portrait sitting', 32000, 120, undefined, 'Two hours in the studio, ten finished images'], ['Product still life', 45000, 240], ['Print review', 6000, 45]],
    staff: [['Ida Holm'], ['Rasmus Berg']],
  },
  carte: {
    name: 'Osteria Vela', category: 'other', description: 'Handmade pasta, natural wine and a long table by the window.', city: 'Bologna',
    hero: 'restaurant', gallery: ['food-table', 'food-plates', 'coffee'],
    services: [['Table for two', null, 120, undefined, 'Lunch or dinner, kitchen open till late'], ['Tasting menu', 6500, 150, undefined, 'Seven courses, wine pairing optional'], ['Private room', null, 180, undefined, 'Up to twelve guests'], ['Pasta class', 8500, 180, undefined, 'Saturday mornings, all ingredients included']],
    staff: [['Chiara']],
  },
  shelf: {
    name: 'Polish Bar', category: 'nails_lashes', description: 'Nails, brows and the good skincare. Pop in or book a seat.', city: 'Amsterdam',
    hero: 'nails', gallery: ['skincare', 'spa-still', 'rail', 'nails'],
    services: [['Gel manicure', 4200, 50, 'nails'], ['Skin reset facial', 7500, 60, 'skincare'], ['Brow lamination', 5500, 45, 'portrait-pink'], ['Hand ritual', 3500, 30, 'spa-still']],
    staff: [['Noor'], ['Evi']],
  },
  neighbour: {
    name: 'Fixwell Home', category: 'cleaning', description: 'Cleaning, small repairs and electrics across the city. Same-week visits.', city: 'Leeds',
    hero: 'window-clean', gallery: ['clean-lounge', 'electrician', 'window-clean'],
    services: [['Deep clean', 14000, 240, 'clean-lounge'], ['Electrical check', 8000, 60, 'electrician'], ['Window clean', 6000, 90, 'window-clean']],
    staff: [['Sam'], ['Priya']],
  },
  noir: {
    name: 'Maison Sable', category: 'spa', description: 'Slow treatments in a quiet house. Oils, stone and warm linen.', city: 'Paris',
    hero: 'massage', gallery: ['spa-still', 'calm-room'],
    services: [['Signature massage', 14000, 90, undefined, 'Warm oil, full body'], ['Stone ritual', 16000, 105], ['Facial in the dark', 12000, 60], ['Hammam & scrub', 9000, 45]],
    staff: [['Léa'], ['Inès']],
  },
  pulse: {
    name: 'Forge Athletic', category: 'fitness', description: 'Strength, conditioning and coaching that shows up for you.', city: 'Berlin',
    hero: 'gym', gallery: ['workout', 'gym'],
    services: [['Strength 1:1', 7000, 60], ['Small group HIIT', 2000, 45], ['Mobility', 2500, 30]],
    staff: [['Jonas', 'workout'], ['Mara']],
  },
  folio: {
    name: 'Kai Moreno', category: 'photography', description: 'Film photographer. Portraits, places and the light in between.', city: 'Barcelona',
    hero: 'camera-prints', gallery: ['photographer', 'yoga-dusk', 'terrace', 'camera-lenses', 'food-table', 'calm-room'],
    services: [['Portrait session', 25000, 90], ['Editorial day', null, 480], ['Print consult', 0, 30]],
    staff: [['Kai Moreno']],
  },
  practice: {
    name: 'Northside Dental', category: 'clinic', description: 'Check-ups, hygiene and gentle care for nervous patients.', city: 'Dublin',
    hero: 'dental', gallery: ['clinic-desk', 'dental'],
    services: [['Check-up', 6500, 30, undefined, 'Exam and advice'], ['Hygiene clean', 8500, 45], ['Whitening consult', 0, 20], ['Emergency visit', 9500, 30]],
    staff: [['Dr. Aoife Byrne'], ['Dr. Tom Walsh']],
  },
  bistro: {
    name: 'Comptoir Rive', category: 'other', description: 'A small kitchen on the river: market cooking, natural wine, a long zinc bar.', city: 'Lyon',
    hero: 'restaurant', gallery: ['pasta', 'wine', 'food-plates'],
    services: [['Table for two', null, 120, undefined, 'Lunch or dinner, kitchen open till late'], ['Menu du marché', 3800, 120, undefined, 'Three courses, changes daily'], ['Tasting menu', 7200, 150, undefined, 'Six courses, wine pairing optional'], ['Wine at the bar', null, 90, undefined, 'Walk in, or reserve a stool'], ['Private dining', null, 180, undefined, 'The back room, up to ten'], ['Sunday lunch', 4500, 120, undefined, 'Roast, sides and a pudding']],
    staff: [['Camille'], ['Théo']],
  },
  hatch: {
    name: 'Smash Lane', category: 'other', description: 'Smash burgers, birria tacos and loaded fries. Order ahead, skip the queue.', city: 'Manchester',
    hero: 'burger', gallery: ['tacos', 'burger', 'pizza', 'food-table'],
    services: [['Double smash', 1100, 15, 'burger', 'Two patties, American cheese, pickles'], ['Birria tacos', 1200, 15, 'tacos', 'Three tacos and a cup of consommé'], ['Pizza slice', 450, 10, 'pizza'], ['Party tray', null, 30, undefined, 'Feeds ten, order a day ahead']],
    staff: [['Rico'], ['Jas']],
  },
  hearth: {
    name: 'Crumb & Kettle', category: 'other', description: 'Sourdough, slow coffee and cake big enough to share. Dogs welcome.', city: 'Bristol',
    hero: 'cafe', gallery: ['croissants', 'coffee', 'cake', 'cafe'],
    services: [['Table for breakfast', 0, 60, 'croissants', 'Book a table, pay at the counter'], ['Celebration cake', 4200, 30, 'cake', 'Order three days ahead, collect in store'], ['Coffee tasting', 1500, 45, 'coffee', 'Saturdays at 10'], ['Bread class', 6500, 180, undefined, 'Take home your own sourdough']],
    staff: [['Hannah'], ['Owen'], ['Bea']],
  },
  atelier: {
    name: 'Studio Ondine', category: 'other', description: 'Stoneware, leather and small objects, made in our studio and sold by appointment.', city: 'Copenhagen',
    hero: 'ceramics', gallery: ['boutique', 'ceramics', 'candle', 'bag'],
    services: [['Stoneware set', 9500, 30, 'ceramics', 'Four cups, glazed by hand'], ['Leather day bag', 34000, 30, 'bag', 'Vegetable-tanned, made to order'], ['Steel watch', 21000, 30, 'watch'], ['Studio visit', 0, 45, undefined, 'See the work and the workshop']],
    staff: [['Ondine'], ['Mikkel']],
  },
  stockroom: {
    name: 'Groove & Grain', category: 'other', description: 'Records, headphones and turntables, bought, sold and set up properly.', city: 'Berlin',
    hero: 'vinyl', gallery: ['vinyl', 'headphones', 'boutique', 'watch', 'bag', 'candle'],
    services: [['Rare jazz LP', 4500, 15, 'vinyl'], ['Studio headphones', 18900, 15, 'headphones'], ['Field watch', 12900, 15, 'watch'], ['Turntable setup', 3500, 60], ['Listening booth', 800, 30, 'vinyl', 'Half an hour, any record in the shop'], ['Record valuation', 0, 30]],
    staff: [['Jonas'], ['Ilka']],
  },
  bloom: {
    name: 'Petal & Wick', category: 'other', description: 'Seasonal flowers and hand-poured candles, wrapped with care.', city: 'Amsterdam',
    hero: 'flowers', gallery: ['flowers', 'candle', 'spa-still', 'skincare', 'calm-room'],
    services: [['Seasonal bouquet', 4500, 15, 'flowers', 'Whatever is best this week'], ['Soy candle', 2800, 15, 'candle', 'Fig and cedar, 40-hour burn'], ['Gift box', 6500, 15, 'skincare', 'Candle, balm and a small bunch'], ['Bouquet workshop', 7500, 120, 'spa-still', 'Thursday evenings, all flowers included']],
    staff: [['Noor'], ['Femke']],
  },
};

/** A sample business for a template's gallery card, drawn with that template's defaults. */
export function sampleBusiness(template: SiteTemplate): PublicBusiness {
  const s = SAMPLES[template.slug] ?? SAMPLES.classic!;
  const site: ResolvedSite = {
    template: { id: template.id, slug: template.slug, name: template.name, version: template.version, schemaVersion: template.schemaVersion, layout: template.layout },
    theme: template.defaultTheme,
    notice: null,
  };
  const services = s.services.map(([name, minor, minutes, photo, description], i) => ({
    id: `s${i}`,
    name,
    description: description ?? null,
    priceType: minor === null ? ('quote' as const) : minor === 0 ? ('free' as const) : ('fixed' as const),
    priceMinor: minor || null,
    durationMin: minutes,
    bookable: minor !== null,
    depositMinor: null,
    image: photo ? img(photo) : null,
  }));
  return {
    slug: 'sample',
    name: s.name,
    category: s.category,
    description: s.description,
    locationType: 'premises',
    addressLine1: '12 Market Street',
    addressLine2: null,
    city: s.city,
    region: null,
    postalCode: null,
    country: 'GB',
    serviceAreas: [],
    phone: '+44 20 7946 0000',
    whatsapp: null,
    email: 'hello@example.com',
    logo: null,
    hero: s.hero ? img(s.hero) : null,
    gallery: s.gallery.map(img),
    site,
    timezone: 'Europe/London',
    currency: 'EUR',
    showBadge: true,
    hours: WEEK,
    services,
    staff: s.staff.map(([name, photo], i) => ({ id: `p${i}`, name, serviceIds: services.filter((x) => x.bookable).map((x) => x.id), photo: photo ? img(photo) : null })),
    faqs: [],
    booking: { windowDays: 60, customerFields: { phone: 'optional', note: 'optional' }, deposits: null },
  };
}
