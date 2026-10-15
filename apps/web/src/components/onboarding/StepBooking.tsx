import type { CustomerFields, OwnerBusiness } from '@bookpage/shared';
import { newKey, type StaffDraft } from './model';
import { Chips, Field, Section, Switch } from './ui';

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

export function StepBooking(props: {
  /** Overrides the onboarding heading (used on My page). */
  heading?: { kicker: string; title: string; intro?: string };
  rules: Rules;
  onRules: (patch: Partial<Rules>) => void;
  staff: StaffDraft[];
  onStaff: (staff: StaffDraft[]) => void;
}) {
  const { rules, onRules, staff, onStaff } = props;
  const setField = (patch: Partial<CustomerFields>) => onRules({ customerFields: { ...rules.customerFields, ...patch } });
  // Keep the saved value selectable even if it isn't one of the presets.
  const notice = NOTICE.some((n) => n.value === rules.minNoticeMin) ? NOTICE : [...NOTICE, { value: rules.minNoticeMin, label: `${rules.minNoticeMin} min` }];
  const window_ = WINDOW.some((w) => w.value === rules.windowDays) ? WINDOW : [...WINDOW, { value: rules.windowDays, label: `${rules.windowDays} days` }];

  return (
    <Section {...(props.heading ?? { kicker: "Step 3 · Booking", title: "How booking works", intro: "Free times on your page come from your hours, minus bookings and these rules." })}>
      <Chips label="Minimum notice" value={rules.minNoticeMin} options={notice} onChange={(minNoticeMin) => onRules({ minNoticeMin })} />
      <Chips label="How far ahead can people book?" value={rules.windowDays} options={window_} onChange={(windowDays) => onRules({ windowDays })} />

      <Switch label="Confirm bookings automatically" checked={rules.autoConfirm}
        note={rules.autoConfirm ? 'Customers see "confirmed" straight away.' : 'You approve each booking first.'}
        onChange={(autoConfirm) => onRules({ autoConfirm })} />

      <fieldset class="ob-team">
        <legend class="lab">Who takes bookings?</legend>
        <p class="ob-hint">Each person gets their own calendar. Add more if customers can book with different people.</p>
        <ul>
          {staff.map((p, i) => (
            <li class="ob-person">
              <Field label={`Person ${i + 1}`}>
                {(id) => (
                  <input id={id} class="ob-input" value={p.name} maxLength={60}
                    onInput={(e) => onStaff(staff.map((x) => (x.key === p.key ? { ...x, name: e.currentTarget.value } : x)))} />
                )}
              </Field>
              {staff.length > 1 && (
                <button type="button" class="btn ob-remove" aria-label={`Remove ${p.name || 'this person'}`}
                  onClick={() => onStaff(staff.filter((x) => x.key !== p.key))}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        <button type="button" class="btn ob-add" onClick={() => onStaff([...staff, { key: newKey(), name: '' }])}>
          + Add a person
        </button>
      </fieldset>

      <fieldset class="ob-fields">
        <legend class="lab">What to ask customers</legend>
        <p class="ob-hint">Name and email are always asked: confirmations and reminders go by email.</p>
        <Chips label="Phone number" value={rules.customerFields.phone}
          options={[{ value: 'required', label: 'Required' }, { value: 'optional', label: 'Optional' }, { value: 'off', label: "Don't ask" }]}
          onChange={(phone) => setField({ phone })} />
        <Switch label="Notes box" note="Lets customers add details, like hair length or the car's make."
          checked={rules.customerFields.note === 'optional'} onChange={(on) => setField({ note: on ? 'optional' : 'off' })} />
      </fieldset>

      <p class="ob-hint">New bookings are emailed to you. WhatsApp alerts are coming soon.</p>
    </Section>
  );
}
