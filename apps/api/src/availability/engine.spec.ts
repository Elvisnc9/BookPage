import { describe, expect, it } from 'vitest';
import { type AvailabilityInput, findSlots } from './engine';
import { addDays, localDate, zonedToUtc } from '@bookpage/shared';

const h = (hours: number, minutes = 0) => hours * 60 + minutes;
const NY = 'America/New_York';

/** A Monday 9:00–12:00 in UTC, one staff member, 60-minute service, slots every 30 min. */
function input(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    now: new Date('2030-01-01T00:00:00Z'), // a Tuesday, well before the test dates
    timezone: 'UTC',
    minNoticeMin: 0,
    windowDays: 60,
    slotStepMin: 30,
    hours: [{ weekday: 1, opensAt: h(9), closesAt: h(12) }],
    durationMin: 60,
    bufferMin: 0,
    staff: [{ id: 'maya', busy: [] }],
    fromDate: '2030-01-07', // Monday
    days: 1,
    ...overrides,
  };
}

const times = (result: ReturnType<typeof findSlots>, date = '2030-01-07') =>
  result.find((d) => d.date === date)?.slots.map((s) => s.start.toISOString().slice(11, 16)) ?? [];

describe('zoned time helpers', () => {
  it('converts local wall time to UTC across daylight saving', () => {
    expect(zonedToUtc('2030-01-15', h(9), NY).toISOString()).toBe('2030-01-15T14:00:00.000Z'); // EST
    expect(zonedToUtc('2030-07-15', h(9), NY).toISOString()).toBe('2030-07-15T13:00:00.000Z'); // EDT
    // 2030-03-10 is the spring-forward day in the US.
    expect(zonedToUtc('2030-03-10', h(9), NY).toISOString()).toBe('2030-03-10T13:00:00.000Z');
    expect(zonedToUtc('2030-03-09', h(9), NY).toISOString()).toBe('2030-03-09T14:00:00.000Z');
    expect(zonedToUtc('2030-06-01', h(9), 'Europe/London').toISOString()).toBe('2030-06-01T08:00:00.000Z');
  });

  it('handles midnight as the end of a day', () => {
    expect(zonedToUtc('2030-01-15', 1440, 'UTC').toISOString()).toBe('2030-01-16T00:00:00.000Z');
  });

  it('finds the local date and weekday of an instant', () => {
    // 03:00 UTC on the 2nd is still the evening of the 1st in New York.
    expect(localDate(new Date('2030-01-02T03:00:00Z'), NY)).toEqual({ date: '2030-01-01', weekday: 2 });
    expect(localDate(new Date('2030-01-06T12:00:00Z'), 'UTC')).toEqual({ date: '2030-01-06', weekday: 7 });
  });

  it('adds days to a calendar date', () => {
    expect(addDays('2030-01-31', 1)).toBe('2030-02-01');
    expect(addDays('2030-12-31', 1)).toBe('2031-01-01');
  });
});

describe('findSlots', () => {
  it('offers every start time where the whole service fits in opening hours', () => {
    expect(times(findSlots(input()))).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00']);
  });

  it('offers nothing on closed days', () => {
    expect(times(findSlots(input({ fromDate: '2030-01-08' })), '2030-01-08')).toEqual([]);
  });

  it('offers nothing when the service is longer than the opening', () => {
    expect(times(findSlots(input({ durationMin: 240 })))).toEqual([]);
  });

  it('lets the buffer run past closing time', () => {
    expect(times(findSlots(input({ bufferMin: 30 })))).toContain('11:00');
  });

  it('supports several ranges in a day (a lunch break)', () => {
    const hours = [
      { weekday: 1, opensAt: h(9), closesAt: h(11) },
      { weekday: 1, opensAt: h(13), closesAt: h(15) },
    ];
    expect(times(findSlots(input({ hours })))).toEqual(['09:00', '09:30', '10:00', '13:00', '13:30', '14:00']);
  });

  it('removes slots that overlap an existing booking', () => {
    const staff = [{ id: 'maya', busy: [{ start: new Date('2030-01-07T10:00:00Z'), end: new Date('2030-01-07T11:00:00Z') }] }];
    expect(times(findSlots(input({ staff })))).toEqual(['09:00', '11:00']);
  });

  it("keeps the new booking's buffer clear of the next booking", () => {
    const staff = [{ id: 'maya', busy: [{ start: new Date('2030-01-07T11:00:00Z'), end: new Date('2030-01-07T12:00:00Z') }] }];
    // 60 min + 15 min buffer: 09:30 would block until 10:45, fine; 10:00 would block until 11:15, overlapping.
    expect(times(findSlots(input({ staff, bufferMin: 15 })))).toEqual(['09:00', '09:30']);
  });

  it("treats an existing booking's buffer as taken", () => {
    // Existing booking 09:00–10:00 with a 15-min buffer is stored as busy until 10:15.
    const staff = [{ id: 'maya', busy: [{ start: new Date('2030-01-07T09:00:00Z'), end: new Date('2030-01-07T10:15:00Z') }] }];
    expect(times(findSlots(input({ staff, slotStepMin: 15 })))).toEqual(['10:15', '10:30', '10:45', '11:00']);
  });

  it('is free if anyone on the team is free, and says who', () => {
    const busy = [{ start: new Date('2030-01-07T09:00:00Z'), end: new Date('2030-01-07T12:00:00Z') }];
    const staff = [{ id: 'maya', busy }, { id: 'jordan', busy: [] }];
    const day = findSlots(input({ staff }))[0]!;
    expect(day.slots.map((s) => s.staffIds)).toEqual(Array(5).fill(['jordan']));
  });

  it('offers nothing when the team is empty', () => {
    expect(times(findSlots(input({ staff: [] })))).toEqual([]);
  });

  it('respects minimum notice', () => {
    const now = new Date('2030-01-07T08:10:00Z');
    expect(times(findSlots(input({ now, minNoticeMin: 120 })))).toEqual(['10:30', '11:00']);
  });

  it('never offers times in the past', () => {
    const now = new Date('2030-01-07T09:45:00Z');
    expect(times(findSlots(input({ now })))).toEqual(['10:00', '10:30', '11:00']);
  });

  it('stops at the booking window', () => {
    const now = new Date('2030-01-06T12:00:00Z'); // Sunday
    const result = findSlots(input({ now, windowDays: 7, fromDate: '2030-01-06', days: 21 }));
    // Window of 7 days from Sunday the 6th ends on Sunday the 13th: Monday the 14th is out.
    const open = result.filter((d) => d.slots.length).map((d) => d.date);
    expect(open).toEqual(['2030-01-07']);
    expect(result.at(-1)!.date).toBe('2030-01-13');
  });

  it('skips dates before today in the business time zone', () => {
    const now = new Date('2030-01-08T12:00:00Z');
    expect(findSlots(input({ now, fromDate: '2030-01-06', days: 3 })).map((d) => d.date)).toEqual(['2030-01-08']);
  });

  it('works in local time for a business in New York', () => {
    const hours = [{ weekday: 1, opensAt: h(9), closesAt: h(11) }];
    const result = findSlots(input({ timezone: NY, hours }));
    // 9:00 and 9:30 and 10:00 local = 14:00, 14:30, 15:00 UTC in January.
    expect(times(result)).toEqual(['14:00', '14:30', '15:00']);
  });

  it('keeps 9:00 local on the day the clocks change', () => {
    const hours = [{ weekday: 7, opensAt: h(9), closesAt: h(10) }];
    const result = findSlots(input({ timezone: NY, hours, fromDate: '2030-03-10', windowDays: 365 }));
    expect(times(result, '2030-03-10')).toEqual(['13:00']);
  });
});
