import type { APIRoute } from 'astro';
import { getBusiness, getBooking, PublicApiError } from '../../../../../lib/public';

/** "Add to calendar": a one-event iCalendar file for the booking. */
export const GET: APIRoute = async ({ locals, request, url }) => {
  // After the host rewrite, endpoint params are empty and `url` is the original
  // /booked/{id}/calendar.ics, so read the slug from locals and the id from the path.
  const slug = locals.slug ?? '';
  const id = url.pathname.match(/\/booked\/([0-9a-f-]{36})\/calendar\.ics$/i)?.[1] ?? '';
  try {
    const [b, booking] = await Promise.all([getBusiness(slug, request), getBooking(slug, id, url.searchParams.get('t') ?? '', request)]);
    const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
    const location = [b.addressLine1, b.city, b.postalCode].filter(Boolean).join(', ');
    const body = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BookPage//Booking//EN',
      'BEGIN:VEVENT',
      `UID:${booking.id}@bookpage.app`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(booking.startsAt)}`,
      `DTEND:${stamp(booking.endsAt)}`,
      `SUMMARY:${esc(`${booking.serviceName} at ${booking.businessName}`)}`,
      ...(location ? [`LOCATION:${esc(location)}`] : []),
      `DESCRIPTION:${esc(`With ${booking.staffName}. Change or cancel: ${url.origin}/booked/${booking.id}?t=${url.searchParams.get('t')}`)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    return new Response(body, {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': `attachment; filename="booking.ics"`,
        'cache-control': 'private, no-store',
      },
    });
  } catch (error) {
    if (error instanceof PublicApiError && error.status === 404) return new Response('Not found', { status: 404 });
    throw error;
  }
};
