// Pure formatting for booking pages and the onboarding preview. No server-only
// imports here: this file is bundled into the owner app too.
import { formatMinutes, formatMoney, localDate, type PublicBusiness, type PublicService } from '@bookpage/shared';

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

/** First and last word, by grapheme, so "Jo" → "J", "Ama Mensah III" → "AI", emoji stay whole. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'BP';
  const first = (w: string) => {
    const seg = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter().segment(w)][0]?.segment : w[0];
    return seg ?? '';
  };
  const picked = words.length === 1 ? [words[0]!] : [words[0]!, words[words.length - 1]!];
  return picked.map(first).join('').toUpperCase();
}
