/** ISO weekdays, 1 = Monday. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** 570 → "9:30 AM"; 1440 → "12:00 AM" (midnight, end of day). */
export function formatMinutes(minutes: number, locale = 'en-US'): string {
  const date = new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60) % 24, minutes % 60));
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(date);
}

/** 45 → "45 min", 90 → "1 h 30 min", 120 → "2 h". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
