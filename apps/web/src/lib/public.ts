import { API_URL } from 'astro:env/server';
import { visitorHeaders } from './api';
import {
  type BookingRequest,
  type CreatedBooking,
  type EnquiryRequest,
  formatMinutes,
  localDate,
  type PublicBooking,
  type PublicBusiness,
  type PublicDay,
  type PublicService,
  formatMoney,
} from '@bookpage/shared';

/**
 * Server-side calls from a booking page to the API's /public/{slug} endpoints.
 * Each takes the visitor's request so the API rate-limits the visitor, not us.
 */
export class PublicApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: { message?: string; code?: string; issues?: { path: string; message: string }[] },
  ) {
    super(body.message ?? `API ${status}`);
  }

  /** The API's per-visitor rate limit was hit. */
  get tooManyAttempts() {
    return this.status === 429;
  }
}

export const TOO_MANY_ATTEMPTS = 'Too many attempts, try again in a minute.';

async function call<T>(slug: string, path: string, visitor: Request, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/public/${encodeURIComponent(slug)}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...visitorHeaders(visitor),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new PublicApiError(res.status, body as PublicApiError['body']);
  return body as T;
}

export const getBusiness = (slug: string, visitor: Request) => call<PublicBusiness>(slug, '', visitor);

export const getAvailability = (slug: string, serviceId: string, staffId: string | null, visitor: Request, days = 14) =>
  call<PublicDay[]>(slug, `/availability?serviceId=${serviceId}&days=${days}${staffId ? `&staffId=${staffId}` : ''}`, visitor);

export const createBooking = (slug: string, body: BookingRequest, visitor: Request) =>
  call<CreatedBooking>(slug, '/bookings', visitor, { method: 'POST', body: JSON.stringify(body) });

export const getBooking = (slug: string, id: string, token: string, visitor: Request) =>
  call<PublicBooking>(slug, `/bookings/${id}?token=${encodeURIComponent(token)}`, visitor);

export const cancelBooking = (slug: string, id: string, token: string, visitor: Request) =>
  call<PublicBooking>(slug, `/bookings/${id}/cancel`, visitor, { method: 'POST', body: JSON.stringify({ token }) });

export const sendEnquiry = (slug: string, body: EnquiryRequest, visitor: Request) =>
  call<{ ok: true }>(slug, '/enquiries', visitor, { method: 'POST', body: JSON.stringify(body) });

/** Loads the business for a booking page, or a 404 response for unknown/unpublished ones. */
export async function loadBusiness(slug: string | undefined, visitor: Request): Promise<PublicBusiness | Response> {
  try {
    return await getBusiness(slug ?? '', visitor);
  } catch (error) {
    if (error instanceof PublicApiError && error.status === 404) return new Response('Not found', { status: 404 });
    throw error;
  }
}

// ─── Formatting in the business's own time zone ────────────────────────────

export function price(s: Pick<PublicService, 'priceType' | 'priceMinor'>, currency: string) {
  if (s.priceType === 'quote') return 'Quote';
  if (s.priceType === 'free') return 'Free';
  return `${s.priceType === 'from' ? 'From ' : ''}${formatMoney(s.priceMinor ?? 0, currency)}`;
}

export const timeOf = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(iso));

/** "2030-01-07" → { weekday: "Mon", day: "7", long: "Monday 7 January" } */
export function dayLabel(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...o, timeZone: 'UTC' }).format(d);
  return { weekday: f({ weekday: 'short' }), day: f({ day: 'numeric' }), month: f({ month: 'short' }), long: f({ weekday: 'long', day: 'numeric', month: 'long' }) };
}

export function whenLabel(startIso: string, timeZone: string) {
  const { date } = localDate(new Date(startIso), timeZone);
  return `${dayLabel(date).long}, ${timeOf(startIso, timeZone)}`;
}

/** "Open now · closes 6:00 PM" / "Closed · opens Tue 9:00 AM" */
export function openStatus(b: Pick<PublicBusiness, 'hours' | 'timezone'>, now = new Date()) {
  const { date, weekday } = localDate(now, b.timezone);
  const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hourCycle: 'h23', timeZone: b.timezone }).formatToParts(now);
  const minutes = Number(parts.find((p) => p.type === 'hour')?.value) * 60 + Number(parts.find((p) => p.type === 'minute')?.value);

  const today = b.hours.filter((h) => h.weekday === weekday);
  const current = today.find((h) => h.opensAt <= minutes && minutes < h.closesAt);
  if (current) return { open: true, text: `Open now · closes ${current.closesAt === 1440 ? 'midnight' : formatMinutes(current.closesAt)}` };

  const laterToday = today.find((h) => h.opensAt > minutes);
  if (laterToday) return { open: false, text: `Closed · opens ${formatMinutes(laterToday.opensAt)}` };
  for (let i = 1; i <= 7; i++) {
    const wd = ((weekday - 1 + i) % 7) + 1;
    const next = b.hours.filter((h) => h.weekday === wd).sort((a, c) => a.opensAt - c.opensAt)[0];
    if (next) return { open: false, text: `Closed · opens ${i === 1 ? 'tomorrow' : dayLabel(shift(date, i)).weekday} ${formatMinutes(next.opensAt)}` };
  }
  return { open: false, text: 'Closed' };
}

const shift = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 864e5).toISOString().slice(0, 10);

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'BP';
