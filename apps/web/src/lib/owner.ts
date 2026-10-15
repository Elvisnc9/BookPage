import type { AstroGlobal } from 'astro';
import type { BookingStatus, OwnerBooking, OwnerSummary } from '@bookpage/shared';
import { apiFetch } from './api';

/** Server-side calls from dashboard pages to the API, as the signed-in owner. */
async function get<T>(path: string, request: Request): Promise<T> {
  const res = await apiFetch(path, request);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export const getSummary = (request: Request) => get<OwnerSummary>('/business/summary', request);

export async function getBookings(request: Request, q: { from?: Date; to?: Date; status?: BookingStatus[]; order?: 'asc' | 'desc' }) {
  const p = new URLSearchParams();
  if (q.from) p.set('from', q.from.toISOString());
  if (q.to) p.set('to', q.to.toISOString());
  if (q.status?.length) p.set('status', q.status.join(','));
  if (q.order) p.set('order', q.order);
  return (await get<{ bookings: OwnerBooking[] }>(`/business/bookings?${p}`, request)).bookings;
}

const DONE: Record<string, string> = {
  confirmed: 'Approved. The customer has been emailed.',
  declined: 'Declined. The customer has been emailed and the time is free again.',
  cancelled: 'Cancelled. The customer has been emailed and the time is free again.',
  completed: 'Marked as done.',
  no_show: 'Marked as a no-show.',
};

/**
 * Handles a booking action form posted to a dashboard page, then redirects back
 * (post/redirect/get) with a message, so refreshing never repeats the action.
 */
export async function handleBookingAction(Astro: AstroGlobal): Promise<Response | null> {
  if (Astro.request.method !== 'POST') return null;
  const form = await Astro.request.formData();
  const id = String(form.get('id') ?? '');
  const status = String(form.get('status') ?? '');
  const reason = String(form.get('reason') ?? '').trim();
  const wasPending = form.get('was') === 'pending';

  const res = await apiFetch(`/business/bookings/${encodeURIComponent(id)}/status`, Astro.request, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });

  const back = new URL(Astro.url);
  // Pages see the rewritten /app/... path; the browser knows them without the prefix.
  back.pathname = back.pathname.replace(/^\/app(?=\/|$)/, '') || '/';
  back.searchParams.delete('done');
  back.searchParams.delete('error');
  if (res.ok) {
    back.searchParams.set('done', status === 'cancelled' && wasPending ? 'declined' : status);
  } else {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    back.searchParams.set('error', body.message ?? "That didn't work. Refresh and try again.");
  }
  return Astro.redirect(`${back.pathname}${back.search}#b-${id}`, 303);
}

/** The message to show after a redirect from handleBookingAction. */
export function flash(url: URL): { tone: 'ok' | 'bad'; text: string } | null {
  const done = url.searchParams.get('done');
  if (done && DONE[done]) return { tone: 'ok', text: DONE[done] };
  const error = url.searchParams.get('error');
  return error ? { tone: 'bad', text: error.slice(0, 200) } : null;
}
