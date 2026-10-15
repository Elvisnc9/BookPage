/**
 * Time zone helpers built on Intl (no Temporal in Node yet). A "date" here is a
 * calendar date string YYYY-MM-DD in the business's own time zone.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

function wallClock(utcMs: number, timeZone: string) {
  const parts: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(utcMs)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return { year: parts.year!, month: parts.month!, day: parts.day!, hour: parts.hour!, minute: parts.minute!, second: parts.second! };
}

/** How far ahead of UTC the zone is at that instant, in ms (e.g. -5h for New York in winter). */
function offsetMs(utcMs: number, timeZone: string): number {
  const w = wallClock(utcMs, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** The instant when the clock in `timeZone` shows `minutes` past midnight on `date`. */
export function zonedToUtc(date: string, minutes: number, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const naive = Date.UTC(y, m - 1, d) + minutes * 60_000;
  const first = naive - offsetMs(naive, timeZone);
  const second = offsetMs(first, timeZone);
  // Re-check once: the offset can differ either side of a daylight-saving change.
  return new Date(naive - second);
}

/** The calendar date and ISO weekday (1 = Monday) of an instant in `timeZone`. */
export function localDate(instant: Date, timeZone: string): { date: string; weekday: number } {
  const w = wallClock(instant.getTime(), timeZone);
  const date = `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}`;
  return { date, weekday: weekdayOf(date) };
}

/** ISO weekday of a calendar date: 1 = Monday … 7 = Sunday. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export const isDateString = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
