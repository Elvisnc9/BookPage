/**
 * Business categories offered in onboarding. `template` is the starting service
 * added when the owner taps "Add a service" (price in minor units, minutes).
 */
export interface Category {
  label: string;
  /** Button text on the booking page. */
  cta: string;
  template: { name: string; priceMinor: number | null; durationMin: number };
}

export const CATEGORIES = {
  hair_salon: { label: 'Salon', cta: 'Book an appointment', template: { name: 'Silk press', priceMinor: 8500, durationMin: 90 } },
  barber: { label: 'Barber', cta: 'Book a chair', template: { name: 'Skin fade', priceMinor: 4000, durationMin: 45 } },
  spa: { label: 'Spa', cta: 'Book a treatment', template: { name: 'Deep tissue massage', priceMinor: 11000, durationMin: 60 } },
  nails_lashes: { label: 'Nails & lashes', cta: 'Book an appointment', template: { name: 'Gel manicure', priceMinor: 4500, durationMin: 60 } },
  clinic: { label: 'Clinic', cta: 'Book a visit', template: { name: 'Consultation', priceMinor: 9000, durationMin: 30 } },
  tutor: { label: 'Tutor', cta: 'Book a lesson', template: { name: 'Maths lesson', priceMinor: 6000, durationMin: 60 } },
  fitness: { label: 'Fitness', cta: 'Book a session', template: { name: 'Personal training', priceMinor: 7000, durationMin: 60 } },
  photography: { label: 'Photography', cta: 'Book a shoot', template: { name: 'Portrait session', priceMinor: 25000, durationMin: 90 } },
  mechanic: { label: 'Mechanic', cta: 'Book a service', template: { name: 'Oil change', priceMinor: 8000, durationMin: 60 } },
  cleaning: { label: 'Cleaning', cta: 'Book a clean', template: { name: 'Standard home clean', priceMinor: 14000, durationMin: 180 } },
  venue: { label: 'Venue', cta: 'Check a date', template: { name: 'Main hall, half day', priceMinor: null, durationMin: 240 } },
  other: { label: 'Other', cta: 'Book now', template: { name: 'Consultation', priceMinor: null, durationMin: 60 } },
} as const satisfies Record<string, Category>;

export type CategoryKey = keyof typeof CATEGORIES;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];
