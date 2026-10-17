import { API_URL } from 'astro:env/server';
import { visitorHeaders } from './api';
import type { BookingRequest, CreatedBooking, EnquiryRequest, PublicBooking, PublicBusiness, PublicDay } from '@bookpage/shared';

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

// Formatting lives in site/format.ts so the onboarding preview shares it.
export { dayLabel, initials, openStatus, price, timeOf, whenLabel } from '../site/format';
