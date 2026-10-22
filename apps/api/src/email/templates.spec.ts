import { describe, expect, it } from 'vitest';
import { customerConfirmation, customerReminder, customerRescheduled, escape, ownerCancelled, ownerEnquiry, ownerNewBooking, when } from './templates';

const base = {
  businessName: 'Glow Studio',
  timezone: 'America/New_York',
  serviceName: 'Silk press',
  staffName: 'Maya',
  startsAt: new Date('2030-01-15T15:30:00Z'), // 10:30 AM in New York
  priceType: 'fixed' as const,
  priceMinor: 8500,
  currency: 'USD',
  address: '214 Bedford Ave, Brooklyn',
  businessPhone: '+17185550142',
  customerName: 'Dana Whitfield',
};

describe('email templates', () => {
  it('shows times in the business time zone', () => {
    expect(when(base.startsAt, 'America/New_York')).toBe('Tuesday 15 January, 10:30 AM');
    expect(when(new Date('2030-01-16T03:00:00Z'), 'America/New_York')).toBe('Tuesday 15 January, 10:00 PM');
  });

  it('confirms a booking with manage and calendar links', () => {
    const e = customerConfirmation({ ...base, status: 'confirmed', manageUrl: 'https://glowstudio.bookpage.app/booked/1?t=abc', calendarUrl: 'https://x/cal.ics' });
    expect(e.subject).toBe('Booked: Silk press at Glow Studio, Tuesday 15 January, 10:30 AM');
    expect(e.html).toContain('See you soon, Dana.');
    expect(e.html).toContain('$85');
    expect(e.html).toContain('https://glowstudio.bookpage.app/booked/1?t=abc');
    expect(e.text).toContain('Change or cancel: https://glowstudio.bookpage.app/booked/1?t=abc');
    expect(e.text).toContain('Add to calendar: https://x/cal.ics');
  });

  it('words a pending booking as a request', () => {
    const e = customerConfirmation({ ...base, status: 'pending', manageUrl: 'u', calendarUrl: 'c' });
    expect(e.subject).toBe('Request sent: Silk press at Glow Studio');
    expect(e.text).not.toContain('Add to calendar');
  });

  it('reminds the customer the day before', () => {
    const e = customerReminder({ ...base, manageUrl: 'https://m' });
    expect(e.subject).toMatch(/^Tomorrow: Silk press at Glow Studio/);
    expect(e.text).toContain('Change or cancel: https://m');
  });

  it('gives the owner everything they need about a new booking', () => {
    const e = ownerNewBooking({ ...base, status: 'pending', customerEmail: 'dana@example.com', customerPhone: '+17185550199', customerNote: 'Fine hair', dashboardUrl: 'https://app' });
    expect(e.subject).toBe('Needs your OK: Dana Whitfield, Silk press, Tuesday 15 January, 10:30 AM');
    expect(e.text).toContain('dana@example.com');
    expect(e.text).toContain('Note: Fine hair');
  });

  it('escapes anything a customer typed', () => {
    const e = ownerEnquiry({
      businessName: 'Glow',
      serviceName: null,
      message: '<script>alert(1)</script>',
      preferredDate: null,
      customerName: 'Eve "<b>"',
      customerEmail: 'eve@example.com',
      customerPhone: null,
    });
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('&lt;script&gt;');
    expect(escape(`a&b<'"`)).toBe('a&amp;b&lt;&#39;&quot;');
  });
  describe('deposits', () => {
    const deposit = { amountMinor: 2000, payUrl: 'https://buy.stripe.com/test_x', dueAt: new Date('2030-01-14T17:00:00Z'), refundHours: 24 };

    it('asks the customer to pay through the owner link, with the deadline and refund rule', () => {
      const e = customerConfirmation({ ...base, status: 'pending', manageUrl: 'https://m', calendarUrl: 'https://c', deposit });
      expect(e.subject).toBe('Pay deposit to confirm: Silk press at Glow Studio, Tuesday 15 January, 10:30 AM');
      expect(e.text).toContain('Pay $20 deposit: https://buy.stripe.com/test_x');
      expect(e.text).toContain('held until Monday 14 January, 12:00 PM');
      expect(e.text).toContain('Refunded if you cancel at least 24 hours before.');
      expect(e.text).toContain('Change or cancel: https://m');
    });

    it('tells the owner a deposit is due and when the hold ends', () => {
      const e = ownerNewBooking({ ...base, status: 'pending', customerEmail: 'd@x.com', customerPhone: null, customerNote: null, dashboardUrl: 'https://app', deposit });
      expect(e.subject).toBe('Deposit due: Dana Whitfield, Silk press, Tuesday 15 January, 10:30 AM');
      expect(e.text).toContain('Deposit: $20 · due by Monday 14 January, 12:00 PM');
      expect(e.text).toContain('Deposit received');
    });

    it('tells the owner whether their policy says to refund a cancelled paid deposit', () => {
      const inTime = ownerCancelled({ ...base, dashboardUrl: 'https://app', depositPaid: { amountMinor: 2000, refundDue: true } });
      expect(inTime.text).toContain('$20 paid. They cancelled in time, so your policy says refund it.');
      const late = ownerCancelled({ ...base, dashboardUrl: 'https://app', depositPaid: { amountMinor: 2000, refundDue: false } });
      expect(late.text).toContain('your policy lets you keep it');
    });
  });

  it('sends the new time when a booking moves', () => {
    const e = customerRescheduled({ ...base, previousStart: new Date('2030-01-14T15:30:00Z'), manageUrl: 'https://m', calendarUrl: 'https://c' });
    expect(e.subject).toBe('New time: Silk press at Glow Studio, Tuesday 15 January, 10:30 AM');
    expect(e.text).toContain('Your old time (Monday 14 January, 10:30 AM) is free again.');
  });
});
