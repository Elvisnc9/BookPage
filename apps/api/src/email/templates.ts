import { formatMoney, localDate } from '@bookpage/shared';

/**
 * Transactional emails. Each returns subject + HTML + plain text. HTML is a
 * single-column table layout that survives Gmail, Outlook and phone clients.
 * Times are always shown in the business's own time zone.
 */
export interface Email {
  subject: string;
  html: string;
  text: string;
}

export interface BookingDetails {
  businessName: string;
  timezone: string;
  serviceName: string;
  staffName: string;
  startsAt: Date;
  priceType: 'fixed' | 'from' | 'quote' | 'free';
  priceMinor: number | null;
  currency: string;
  address: string | null;
  businessPhone: string | null;
  customerName: string;
}

export const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function when(startsAt: Date, timeZone: string): string {
  const { date } = localDate(startsAt, timeZone);
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(startsAt);
  return `${day}, ${time}`;
}

function price(d: Pick<BookingDetails, 'priceType' | 'priceMinor' | 'currency'>) {
  if (d.priceType === 'quote') return 'Quote';
  if (d.priceType === 'free') return 'Free';
  return `${d.priceType === 'from' ? 'From ' : ''}${formatMoney(d.priceMinor ?? 0, d.currency)}`;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

// ─── Layout ─────────────────────────────────────────────────────────────────

interface Row { label: string; value: string }

function layout(opts: { preheader: string; kicker: string; title: string; intro?: string; rows: Row[]; button?: { label: string; url: string }; secondary?: { label: string; url: string }; footer: string }) {
  const rows = opts.rows
    .map((r) => `<tr><td style="padding:8px 0;border-top:1px solid #CFCFD4;font:12px/1.4 ui-monospace,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;color:#5C5C66;width:96px;vertical-align:top">${escape(r.label)}</td><td style="padding:8px 0;border-top:1px solid #CFCFD4;font:600 15px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0D0D10">${escape(r.value).replace(/\n/g, '<br>')}</td></tr>`)
    .join('');
  const button = opts.button
    ? `<tr><td style="padding:20px 0 0"><a href="${escape(opts.button.url)}" style="display:inline-block;padding:12px 18px;background:#0D0D10;color:#FFFFFF;border-radius:6px;font:600 13px/1 ui-monospace,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;text-decoration:none">${escape(opts.button.label)}</a>${
        opts.secondary ? ` &nbsp; <a href="${escape(opts.secondary.url)}" style="font:600 13px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0D0D10">${escape(opts.secondary.label)}</a>` : ''
      }</td></tr>`
    : '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#EBEBE8">
<span style="display:none;max-height:0;overflow:hidden">${escape(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EBEBE8"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:2px solid #0D0D10;border-radius:8px">
<tr><td style="padding:24px">
<p style="margin:0 0 8px;font:12px/1.4 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:#5C5C66">${escape(opts.kicker)}</p>
<h1 style="margin:0 0 12px;font:800 26px/1.15 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:-.02em;color:#0D0D10">${escape(opts.title)}</h1>
${opts.intro ? `<p style="margin:0 0 12px;font:15px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#3C3C44">${escape(opts.intro)}</p>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}${button}</table>
</td></tr></table>
<p style="max-width:520px;margin:16px auto 0;font:12px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#5C5C66">${escape(opts.footer)}</p>
</td></tr></table></body></html>`;

  const text = [
    opts.title,
    ...(opts.intro ? ['', opts.intro] : []),
    '',
    ...opts.rows.map((r) => `${r.label}: ${r.value}`),
    ...(opts.button ? ['', `${opts.button.label}: ${opts.button.url}`] : []),
    ...(opts.secondary ? [`${opts.secondary.label}: ${opts.secondary.url}`] : []),
    '',
    opts.footer,
  ].join('\n');
  return { html, text };
}

function bookingRows(d: BookingDetails): Row[] {
  return [
    { label: 'What', value: `${d.serviceName} · ${price(d)}` },
    { label: 'When', value: when(d.startsAt, d.timezone) },
    { label: 'With', value: d.staffName },
    ...(d.address ? [{ label: 'Where', value: d.address }] : []),
  ];
}

// ─── Customer emails ────────────────────────────────────────────────────────

export function customerConfirmation(d: BookingDetails & { status: 'confirmed' | 'pending'; manageUrl: string; calendarUrl: string }): Email {
  const confirmed = d.status === 'confirmed';
  const subject = confirmed
    ? `Booked: ${d.serviceName} at ${d.businessName}, ${when(d.startsAt, d.timezone)}`
    : `Request sent: ${d.serviceName} at ${d.businessName}`;
  const body = layout({
    preheader: confirmed ? `You're booked for ${when(d.startsAt, d.timezone)}.` : `${d.businessName} will confirm shortly.`,
    kicker: confirmed ? '✓ You are booked' : 'Request sent',
    title: confirmed ? `See you soon, ${firstName(d.customerName)}.` : `Thanks, ${firstName(d.customerName)}.`,
    intro: confirmed ? undefined : `${d.businessName} will confirm your booking by email. The time is held for you meanwhile.`,
    rows: bookingRows(d),
    button: { label: 'Change or cancel', url: d.manageUrl },
    secondary: confirmed ? { label: 'Add to calendar', url: d.calendarUrl } : undefined,
    footer: `${d.businessName}${d.businessPhone ? ` · ${d.businessPhone}` : ''} · Sent by BookPage on behalf of ${d.businessName}.`,
  });
  return { subject, ...body };
}

/** The owner approved a pending booking. */
export function customerApproved(d: BookingDetails & { manageUrl: string; calendarUrl: string }): Email {
  const body = layout({
    preheader: `${d.businessName} confirmed your booking for ${when(d.startsAt, d.timezone)}.`,
    kicker: '✓ Confirmed',
    title: `You're confirmed, ${firstName(d.customerName)}.`,
    intro: `${d.businessName} has confirmed your booking.`,
    rows: bookingRows(d),
    button: { label: 'Change or cancel', url: d.manageUrl },
    secondary: { label: 'Add to calendar', url: d.calendarUrl },
    footer: `${d.businessName}${d.businessPhone ? ` · ${d.businessPhone}` : ''} · Sent by BookPage on behalf of ${d.businessName}.`,
  });
  return { subject: `Confirmed: ${d.serviceName} at ${d.businessName}, ${when(d.startsAt, d.timezone)}`, ...body };
}

/** The owner declined a request or cancelled a confirmed booking. */
export function customerCancelledByBusiness(d: BookingDetails & { declined: boolean; reason: string | null; bookAgainUrl: string }): Email {
  const body = layout({
    preheader: d.declined
      ? `${d.businessName} can't take your booking for ${when(d.startsAt, d.timezone)}.`
      : `${d.businessName} cancelled your booking for ${when(d.startsAt, d.timezone)}.`,
    kicker: d.declined ? 'Not available' : 'Cancelled',
    title: d.declined ? `Sorry, ${firstName(d.customerName)}.` : `Your booking was cancelled.`,
    intro: d.declined
      ? `${d.businessName} can't take this booking. Please pick another time.`
      : `${d.businessName} had to cancel this booking. Please pick another time, or get in touch with them.`,
    rows: [...bookingRows(d), ...(d.reason && !/by business$/.test(d.reason) ? [{ label: 'Note', value: d.reason }] : [])],
    button: { label: 'Book another time', url: d.bookAgainUrl },
    footer: `${d.businessName}${d.businessPhone ? ` · ${d.businessPhone}` : ''} · Sent by BookPage on behalf of ${d.businessName}.`,
  });
  return {
    subject: `${d.declined ? 'Not available' : 'Cancelled'}: ${d.serviceName} at ${d.businessName}, ${when(d.startsAt, d.timezone)}`,
    ...body,
  };
}

/** The customer moved their booking to another time. */
export function customerRescheduled(d: BookingDetails & { previousStart: Date; manageUrl: string; calendarUrl: string }): Email {
  const body = layout({
    preheader: `Your booking with ${d.businessName} is now ${when(d.startsAt, d.timezone)}.`,
    kicker: 'Time changed',
    title: `You're moved, ${firstName(d.customerName)}.`,
    intro: `Your new time is below. Your old time (${when(d.previousStart, d.timezone)}) is free again.`,
    rows: bookingRows(d),
    button: { label: 'Change or cancel', url: d.manageUrl },
    secondary: { label: 'Add to calendar', url: d.calendarUrl },
    footer: `${d.businessName}${d.businessPhone ? ` · ${d.businessPhone}` : ''} · Sent by BookPage on behalf of ${d.businessName}.`,
  });
  return { subject: `New time: ${d.serviceName} at ${d.businessName}, ${when(d.startsAt, d.timezone)}`, ...body };
}

export function customerReminder(d: BookingDetails & { manageUrl: string }): Email {
  const body = layout({
    preheader: `Reminder: ${d.serviceName} at ${d.businessName}, ${when(d.startsAt, d.timezone)}.`,
    kicker: 'Reminder',
    title: `See you tomorrow, ${firstName(d.customerName)}.`,
    intro: `A quick reminder of your booking with ${d.businessName}. Can't make it? Please cancel so someone else can have the time.`,
    rows: bookingRows(d),
    button: { label: 'Change or cancel', url: d.manageUrl },
    footer: `${d.businessName}${d.businessPhone ? ` · ${d.businessPhone}` : ''} · You asked for this reminder when you booked.`,
  });
  return { subject: `Tomorrow: ${d.serviceName} at ${d.businessName}, ${when(d.startsAt, d.timezone)}`, ...body };
}

// ─── Owner emails ───────────────────────────────────────────────────────────

export interface OwnerBookingAlert extends BookingDetails {
  status: 'confirmed' | 'pending';
  customerEmail: string;
  customerPhone: string | null;
  customerNote: string | null;
  dashboardUrl: string;
}

export function ownerNewBooking(d: OwnerBookingAlert): Email {
  const pending = d.status === 'pending';
  const body = layout({
    preheader: `${d.customerName} booked ${d.serviceName} for ${when(d.startsAt, d.timezone)}.`,
    kicker: pending ? 'New booking · needs your OK' : 'New booking',
    title: `${d.customerName} booked ${d.serviceName}.`,
    intro: pending ? 'You approve bookings before they are confirmed. The time is held until you decide.' : undefined,
    rows: [
      { label: 'When', value: when(d.startsAt, d.timezone) },
      { label: 'With', value: d.staffName },
      { label: 'Price', value: price(d) },
      { label: 'Customer', value: [d.customerName, d.customerEmail, d.customerPhone].filter(Boolean).join('\n') },
      ...(d.customerNote ? [{ label: 'Note', value: d.customerNote }] : []),
    ],
    button: { label: pending ? 'Review booking' : 'Open dashboard', url: d.dashboardUrl },
    footer: `Your BookPage for ${d.businessName}.`,
  });
  return { subject: `${pending ? 'Needs your OK' : 'New booking'}: ${d.customerName}, ${d.serviceName}, ${when(d.startsAt, d.timezone)}`, ...body };
}

export function ownerCancelled(d: BookingDetails & { dashboardUrl: string }): Email {
  const body = layout({
    preheader: `${d.customerName} cancelled ${d.serviceName} on ${when(d.startsAt, d.timezone)}. The time is free again.`,
    kicker: 'Cancelled',
    title: `${d.customerName} cancelled.`,
    intro: 'The time is open again on your page.',
    rows: [
      { label: 'Was', value: `${d.serviceName} · ${when(d.startsAt, d.timezone)}` },
      { label: 'With', value: d.staffName },
    ],
    button: { label: 'Open dashboard', url: d.dashboardUrl },
    footer: `Your BookPage for ${d.businessName}.`,
  });
  return { subject: `Cancelled: ${d.customerName}, ${d.serviceName}, ${when(d.startsAt, d.timezone)}`, ...body };
}

export function ownerRescheduled(d: BookingDetails & { previousStart: Date; dashboardUrl: string }): Email {
  const body = layout({
    preheader: `${d.customerName} moved ${d.serviceName} to ${when(d.startsAt, d.timezone)}.`,
    kicker: 'Booking moved',
    title: `${d.customerName} changed their time.`,
    intro: 'The old time is open again on your page.',
    rows: [
      { label: 'Now', value: when(d.startsAt, d.timezone) },
      { label: 'Was', value: when(d.previousStart, d.timezone) },
      { label: 'What', value: d.serviceName },
      { label: 'With', value: d.staffName },
    ],
    button: { label: 'Open dashboard', url: d.dashboardUrl },
    footer: `Your BookPage for ${d.businessName}.`,
  });
  return { subject: `Moved: ${d.customerName}, ${d.serviceName}, now ${when(d.startsAt, d.timezone)}`, ...body };
}

export function ownerEnquiry(d: {
  businessName: string;
  serviceName: string | null;
  message: string;
  preferredDate: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
}): Email {
  const body = layout({
    preheader: `${d.customerName}: ${d.message.slice(0, 90)}`,
    kicker: 'New enquiry',
    title: `${d.customerName} asked for a quote.`,
    intro: 'Reply to this email to answer them directly.',
    rows: [
      ...(d.serviceName ? [{ label: 'Service', value: d.serviceName }] : []),
      { label: 'Message', value: d.message },
      ...(d.preferredDate ? [{ label: 'Date', value: d.preferredDate }] : []),
      { label: 'Contact', value: [d.customerEmail, d.customerPhone].filter(Boolean).join('\n') },
    ],
    footer: `Your BookPage for ${d.businessName}.`,
  });
  return { subject: `Enquiry${d.serviceName ? ` · ${d.serviceName}` : ''}: ${d.customerName}`, ...body };
}
