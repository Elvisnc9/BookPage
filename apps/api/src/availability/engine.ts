import { addDays, localDate, weekdayOf, zonedToUtc } from '@bookpage/shared';

/**
 * Free slots = booking hours − existing bookings − minimum notice, within the
 * booking window, sized by service duration (+ buffer).
 *
 * Pure: everything it needs is passed in, so it can be tested without a database.
 */
export interface AvailabilityInput {
  now: Date;
  /** IANA zone the hours are written in. */
  timezone: string;
  minNoticeMin: number;
  /** Last bookable date = today + windowDays (business time). */
  windowDays: number;
  /** Start times are offered every N minutes from opening. */
  slotStepMin: number;
  /** Booking hours, minutes from midnight; several ranges per weekday allowed. */
  hours: { weekday: number; opensAt: number; closesAt: number }[];
  durationMin: number;
  /** Kept free after the service; may run past closing time. */
  bufferMin: number;
  /** People who can do this service, with what already blocks them ([start, end) where end includes their buffer). */
  staff: { id: string; busy: { start: Date; end: Date }[] }[];
  fromDate: string;
  days: number;
}

export interface Slot {
  start: Date;
  end: Date;
  /** Who is free for the whole slot, in team order. */
  staffIds: string[];
}

export interface DaySlots {
  date: string;
  slots: Slot[];
}

export function findSlots(input: AvailabilityInput): DaySlots[] {
  const today = localDate(input.now, input.timezone).date;
  const lastDate = addDays(today, input.windowDays);
  const earliest = input.now.getTime() + input.minNoticeMin * 60_000;
  const step = Math.max(5, input.slotStepMin);

  const result: DaySlots[] = [];
  for (let i = 0; i < input.days; i++) {
    const date = addDays(input.fromDate, i);
    if (date < today) continue;
    if (date > lastDate) break;

    const weekday = weekdayOf(date);
    const ranges = input.hours.filter((r) => r.weekday === weekday).sort((a, b) => a.opensAt - b.opensAt);
    const slots: Slot[] = [];

    for (const range of ranges) {
      for (let t = range.opensAt; t + input.durationMin <= range.closesAt; t += step) {
        const start = zonedToUtc(date, t, input.timezone);
        if (start.getTime() < earliest) continue;
        const end = new Date(start.getTime() + input.durationMin * 60_000);
        const blockedUntil = end.getTime() + input.bufferMin * 60_000;

        const staffIds = input.staff
          .filter((s) => s.busy.every((b) => b.end.getTime() <= start.getTime() || b.start.getTime() >= blockedUntil))
          .map((s) => s.id);
        if (staffIds.length) slots.push({ start, end, staffIds });
      }
    }
    result.push({ date, slots });
  }
  return result;
}
