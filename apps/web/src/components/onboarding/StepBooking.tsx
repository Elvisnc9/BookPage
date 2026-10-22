import type { CustomerFields, OwnerBusiness } from '@bookpage/shared';
import { useState } from 'preact/hooks';
import { Icon } from '../../site/parts';
import { HoursEditor } from './HoursEditor';
import { ImageSlot } from './ImageSlot';
import { type DayDraft, type ListEdit, newKey, type StaffDraft } from './model';
import { Card, Chips, Field, Section, Switch } from './ui';

type Rules = OwnerBusiness['rules'];

const NOTICE = [
  { value: 0, label: 'None' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 1440, label: '24 hours' },
  { value: 2880, label: '48 hours' },
];
const WINDOW = [
  { value: 7, label: '1 week' },
  { value: 28, label: '4 weeks' },
  { value: 60, label: '2 months' },
  { value: 90, label: '3 months' },
];

const HOLD = [
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 360, label: '6 hours' },
  { value: 1440, label: '24 hours' },
];
const REFUND = [
  { value: 0, label: 'Any time before' },
  { value: 24, label: '24 hours before' },
  { value: 48, label: '48 hours before' },
];

const isPaymentLink = (url: string) => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Deposits without BookPage touching money: the owner pastes their own payment
 * link, the booking waits as pending, and they tap "Deposit received".
 */
function DepositsCard(props: { rules: Rules; onRules: (patch: Partial<Rules>) => void }) {
  const { rules, onRules } = props;
  // The link is saved only once it's a valid https URL (or cleared), so a half-typed link never reaches the API.
  const [link, setLink] = useState(rules.depositUrl ?? '');
  const trimmed = link.trim();
  const invalid = trimmed !== '' && !isPaymentLink(trimmed);
  const hold = HOLD.some((h) => h.value === rules.depositHoldMin) ? HOLD : [...HOLD, { value: rules.depositHoldMin, label: `${rules.depositHoldMin} min` }];
  const refund = REFUND.some((r) => r.value === rules.depositRefundHours) ? REFUND : [...REFUND, { value: rules.depositRefundHours, label: `${rules.depositRefundHours} hours before` }];

  return (
    <Card title="Deposits (optional)" hint="Stop no-shows: customers pay a deposit through your own payment link before their time is confirmed. The money goes straight to you.">
      <Field label="Your payment link" error={invalid ? 'Paste the full link, starting with https://' : undefined}
        hint="A Stripe Payment Link, PayPal.me, Revolut or Monzo link, or similar. Then set a deposit amount on each service.">
        {(id, d) => (
          <input id={id} aria-describedby={d} class="ob-input" type="url" inputMode="url" value={link} maxLength={500} autoComplete="off"
            placeholder="https://paypal.me/yourname" aria-invalid={invalid ? 'true' : undefined}
            onInput={(e) => {
              const value = e.currentTarget.value;
              setLink(value);
              const next = value.trim();
              if (next === '') onRules({ depositUrl: null });
              else if (isPaymentLink(next)) onRules({ depositUrl: next });
            }} />
        )}
      </Field>
      {rules.depositUrl && (
        <>
          <Chips label="Hold the time while they pay" value={rules.depositHoldMin} options={hold} onChange={(depositHoldMin) => onRules({ depositHoldMin })} />
          <Chips label="Refund the deposit if they cancel" value={rules.depositRefundHours} options={refund} onChange={(depositRefundHours) => onRules({ depositRefundHours })} />
          <p class="ob-hint">When the money arrives, tap "Deposit received" on the booking. Unpaid holds are released automatically. You handle refunds in your payment app.</p>
        </>
      )}
    </Card>
  );
}

export function StepBooking(props: {
  /** Overrides the onboarding heading (used on My page). */
  heading?: { kicker?: string; title: string; intro?: string; scan?: string };
  rules: Rules;
  onRules: (patch: Partial<Rules>) => void;
  staff: StaffDraft[];
  onStaff: ListEdit<StaffDraft>;
  /** Opening hours live here in onboarding; My page has its own Hours tab. */
  hours?: { days: DayDraft[]; onDays: ListEdit<DayDraft> };
  media?: { biz: OwnerBusiness; onBiz: (b: OwnerBusiness) => void };
}) {
  const { rules, onRules, staff, onStaff, media } = props;
  const setField = (patch: Partial<CustomerFields>) => onRules({ customerFields: { ...rules.customerFields, ...patch } });
  // Keep the saved value selectable even if it isn't one of the presets.
  const notice = NOTICE.some((n) => n.value === rules.minNoticeMin) ? NOTICE : [...NOTICE, { value: rules.minNoticeMin, label: `${rules.minNoticeMin} min` }];
  const window_ = WINDOW.some((w) => w.value === rules.windowDays) ? WINDOW : [...WINDOW, { value: rules.windowDays, label: `${rules.windowDays} days` }];

  return (
    <Section {...(props.heading ?? { title: 'Set up your bookings', scan: 'bookings', intro: 'Free times on your page come from your hours, minus existing bookings and these rules.' })}>
      {props.hours && (
        <Card title="Opening hours" hint="Customers can book inside these hours.">
          <HoursEditor days={props.hours.days} onDays={props.hours.onDays} legend="Opening hours" />
        </Card>
      )}

      <Card title="Booking rules">
        <Chips label="Minimum notice" value={rules.minNoticeMin} options={notice} onChange={(minNoticeMin) => onRules({ minNoticeMin })} />
        <Chips label="How far ahead can people book?" value={rules.windowDays} options={window_} onChange={(windowDays) => onRules({ windowDays })} />
        <Switch label="Confirm bookings automatically" checked={rules.autoConfirm}
          note={rules.autoConfirm ? 'Customers see "confirmed" straight away.' : 'You approve each booking first.'}
          onChange={(autoConfirm) => onRules({ autoConfirm })} />
      </Card>

      <Card title="Who takes bookings?" hint="Each person gets their own calendar. Add more if customers can book with different people.">
        <ul class="ob-team">
          {staff.map((p, i) => {
            const photo = media && p.id ? media.biz.staff.find((s) => s.id === p.id)?.photo ?? null : null;
            return (
              <li class="ob-person" key={p.key}>
                {media && (
                  <ImageSlot kind="staff" shape="square" image={photo} label="Photo" targetId={p.id} onBiz={media.onBiz} hint={false}
                    blocked={p.id ? undefined : p.name.trim() ? 'Saving…' : 'Name first'} />
                )}
                <Field label={`Person ${i + 1}`}>
                  {(id) => (
                    <input id={id} class="ob-input" value={p.name} maxLength={60} autoComplete="off"
                      onInput={(e) => { const name = e.currentTarget.value; onStaff((cur) => cur.map((x) => (x.key === p.key ? { ...x, name } : x))); }} />
                  )}
                </Field>
                {staff.length > 1 && (
                  <button type="button" class="ob-icon-btn" aria-label={`Remove ${p.name || 'this person'}`}
                    onClick={() => onStaff((cur) => cur.filter((x) => x.key !== p.key))}>
                    <Icon name="plus" size={20} class="ob-x" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <button type="button" class="ob-add" onClick={() => onStaff((cur) => [...cur, { key: newKey(), name: '' }])}>
          <Icon name="plus" size={18} /> Add a person
        </button>
      </Card>

      <DepositsCard rules={rules} onRules={onRules} />

      <Card title="What to ask customers" hint="Name and email are always asked: confirmations and reminders go by email.">
        <Chips label="Phone number" value={rules.customerFields.phone}
          options={[{ value: 'required', label: 'Required' }, { value: 'optional', label: 'Optional' }, { value: 'off', label: "Don't ask" }]}
          onChange={(phone) => setField({ phone })} />
        <Switch label="Notes box" note="Lets customers add details, like hair length or the car's make."
          checked={rules.customerFields.note === 'optional'} onChange={(on) => setField({ note: on ? 'optional' : 'off' })} />
        <p class="ob-hint">New bookings are emailed to you. WhatsApp alerts are coming soon.</p>
      </Card>
    </Section>
  );
}
