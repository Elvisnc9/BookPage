import type { CustomerFields } from './business.js';
import type { BookingStatus, LocationType, PriceType } from './enums.js';
import type { SiteImage } from './media.js';
import type { ResolvedSite } from './site.js';

/**
 * What the booking page may see. Only [public] fields from the schema, plus the
 * time zone (needed to show times) and the booking-form settings.
 */
export interface PublicBusiness {
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  locationType: LocationType;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string;
  serviceAreas: string[];
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  logo: SiteImage | null;
  hero: SiteImage | null;
  gallery: SiteImage[];
  /** The template and theme the page renders with (already resolved; see resolveSite). */
  site: ResolvedSite;
  timezone: string;
  currency: string;
  hours: { weekday: number; opensAt: number; closesAt: number }[];
  services: PublicService[];
  staff: { id: string; name: string; serviceIds: string[]; photo: SiteImage | null }[];
  /** Approved questions, in the owner's order. */
  faqs: { question: string; answer: string }[];
  booking: {
    windowDays: number;
    customerFields: CustomerFields;
    /** Set when the business takes deposits: how long an unpaid hold lasts and the refund window. */
    deposits: { holdMin: number; refundHours: number } | null;
  };
}

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  priceType: PriceType;
  priceMinor: number | null;
  durationMin: number;
  bookable: boolean;
  /** Deposit asked when booking; null when none (or the business has no payment link). */
  depositMinor: number | null;
  image: SiteImage | null;
}

export interface PublicDay {
  date: string;
  slots: { start: string; staffIds: string[] }[];
}

export interface PublicBooking {
  id: string;
  status: BookingStatus;
  serviceId: string;
  staffId: string;
  businessName: string;
  timezone: string;
  serviceName: string;
  staffName: string;
  startsAt: string;
  endsAt: string;
  priceType: PriceType;
  priceMinor: number | null;
  currency: string;
  customerName: string;
  cancellable: boolean;
  /** Can move to another time online (active, in the future, service still bookable). */
  reschedulable: boolean;
  /** Present when this booking asked for a deposit. */
  deposit: PublicDeposit | null;
}

export interface PublicDeposit {
  amountMinor: number;
  /** The owner's payment link; null if they've since removed it. */
  payUrl: string | null;
  /** When an unpaid hold is released. */
  dueAt: string;
  paid: boolean;
  /** Refund promised for cancellations at least this many hours ahead. */
  refundHours: number;
}

/** The booking plus the secret that lets the customer view or cancel it later. */
export interface CreatedBooking {
  booking: PublicBooking;
  manageToken: string;
}
