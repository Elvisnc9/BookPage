export const PRICE_TYPES = ['fixed', 'from', 'quote', 'free'] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const LOCATION_TYPES = ['premises', 'mobile', 'both', 'online'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

/** Public: shown on the page. Private: used by booking logic. Owner: never leaves the dashboard. */
export const FIELD_VISIBILITY = ['public', 'private', 'owner'] as const;
export type FieldVisibility = (typeof FIELD_VISIBILITY)[number];
