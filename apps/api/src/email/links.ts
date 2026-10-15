import { createHmac } from 'node:crypto';

/**
 * Links that go into emails. The booking-management token is derived from the
 * booking id with a server secret, so any email (confirmation now, reminder
 * tomorrow) can carry the same "change or cancel" link without storing it.
 */
const DEV_SECRET = 'dev-only-manage-token-secret-change-me';

function secret(): string {
  const value = process.env.MANAGE_TOKEN_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') throw new Error('Missing environment variable MANAGE_TOKEN_SECRET');
  return DEV_SECRET;
}

export const manageToken = (bookingId: string) =>
  createHmac('sha256', secret()).update(`manage:${bookingId}`).digest('base64url');

/** https://{slug}.bookpage.app in production; http://{slug}.localhost:4321 in dev. */
export function pageOrigin(slug: string): string {
  const template = process.env.PAGE_URL_TEMPLATE || 'http://{slug}.localhost:4321';
  return template.replace('{slug}', slug).replace(/\/$/, '');
}

export const manageUrl = (slug: string, bookingId: string) =>
  `${pageOrigin(slug)}/booked/${bookingId}?t=${manageToken(bookingId)}`;

export const calendarUrl = (slug: string, bookingId: string) =>
  `${pageOrigin(slug)}/booked/${bookingId}/calendar.ics?t=${manageToken(bookingId)}`;

export const dashboardUrl = () => `${(process.env.APP_ORIGIN ?? 'http://localhost:4321').replace(/\/$/, '')}/`;
