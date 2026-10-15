import type { OwnerBusiness, ServiceInput } from '@bookpage/shared';
import { useState } from 'preact/hooks';
import { api } from './api';
import { type SaveState, useAutosave } from './autosave';
import { HoursEditor } from './HoursEditor';
import { type DayDraft, hoursFrom, hoursTo, type ServiceDraft, servicesFrom, serviceTo, type StaffDraft, staffFrom } from './model';
import { StepBooking } from './StepBooking';
import { StepServices } from './StepServices';

const TABS = [
  { key: 'services', label: 'Services' },
  { key: 'hours', label: 'Hours' },
  { key: 'booking', label: 'Booking rules' },
] as const;
type Tab = (typeof TABS)[number]['key'];

/**
 * "My page": edit services, opening hours and booking rules after launch.
 * Same editors and autosave as onboarding; changes go live on the page at once.
 */
export default function MyPage(props: { initial: OwnerBusiness; tab: string }) {
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.key === props.tab) ? (props.tab as Tab) : 'services');
  const [services, setServices] = useState<ServiceDraft[]>(() => servicesFrom(props.initial));
  const [days, setDays] = useState<DayDraft[]>(() => hoursFrom(props.initial));
  const [staff, setStaff] = useState<StaffDraft[]>(() => staffFrom(props.initial));
  const [rules, setRules] = useState(props.initial.rules);

  const servicesSave = useAutosave<ServiceDraft[]>(async (drafts) => {
    const sent: { key: string; input: ServiceInput }[] = [];
    for (const d of drafts) {
      const r = serviceTo(d);
      if ('input' in r) sent.push({ key: d.key, input: r.input });
    }
    if (!sent.length) return; // a live page always keeps at least one service
    const saved = await api('PUT', '/business/services', sent.map((s) => s.input));
    setServices((cur) => cur.map((d) => {
      const i = sent.findIndex((s) => s.key === d.key);
      return i >= 0 && !d.id ? { ...d, id: saved.services[i]?.id } : d;
    }));
  });
  const hoursSave = useAutosave<DayDraft[]>(async (d) => {
    const hours = hoursTo(d);
    if (hours.length) await api('PUT', '/business/hours', hours);
  });
  const staffSave = useAutosave<StaffDraft[]>(async (drafts) => {
    const sent = drafts.filter((d) => d.name.trim());
    if (!sent.length) return;
    const saved = await api('PUT', '/business/staff', sent.map((d) => ({ ...(d.id ? { id: d.id } : {}), name: d.name.trim() })));
    setStaff((cur) => cur.map((d) => {
      const i = sent.findIndex((s) => s.key === d.key);
      return i >= 0 && !d.id ? { ...d, id: saved.staff[i]?.id } : d;
    }));
  });
  const rulesSave = useAutosave<OwnerBusiness['rules']>(async (r) => void (await api('PATCH', '/business/rules', r)));

  const state = combine([servicesSave.state, hoursSave.state, staffSave.state, rulesSave.state]);
  const warning =
    tab === 'services' && !services.some((s) => 'input' in serviceTo(s)) ? 'Keep at least one complete service so customers can book.'
    : tab === 'hours' && !days.some((d) => d.open) ? 'Open at least one day. Until then, your last saved hours stay live.'
    : tab === 'booking' && !staff.some((p) => p.name.trim()) ? 'Keep at least one person who takes bookings.'
    : '';

  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, '', `/page?tab=${t}`);
  };

  return (
    <div class="ob mp">
      <nav class="ap-tabs" aria-label="Edit">
        {TABS.map((t) => (
          <button type="button" class="chip" aria-current={t.key === tab ? 'page' : undefined} onClick={() => go(t.key)}>{t.label}</button>
        ))}
      </nav>

      <div class="mp-body">
        {tab === 'services' && (
          <StepServices services={services} category={props.initial.category as never} currency={props.initial.currency}
            onServices={(next) => { setServices(next); servicesSave.queue(next); }}
            heading={{ kicker: 'My page · Services', title: 'Services', intro: 'Changes show on your page straight away. Removed services stay on past bookings.' }} />
        )}
        {tab === 'hours' && (
          <section class="ob-section">
            <p class="lab">My page · Hours</p>
            <h1 class="h-display">Opening hours</h1>
            <p class="ob-intro">Customers can book inside these hours. Existing bookings are never moved.</p>
            <HoursEditor days={days} onDays={(next) => { setDays(next); hoursSave.queue(next); }} />
          </section>
        )}
        {tab === 'booking' && (
          <StepBooking rules={rules} staff={staff}
            onRules={(patch) => setRules((cur) => { const next = { ...cur, ...patch }; rulesSave.queue(next); return next; })}
            onStaff={(next) => { setStaff(next); staffSave.queue(next); }}
            heading={{ kicker: 'My page · Booking rules', title: 'How booking works', intro: 'Free times on your page come from your hours, minus bookings and these rules.' }} />
        )}
      </div>

      <p class={`mp-status mono${warning || state === 'error' || state === 'invalid' ? ' bad' : ''}`} role="status" aria-live="polite">
        {warning || STATUS[state]}
      </p>
    </div>
  );
}

const STATUS: Record<SaveState, string> = {
  idle: 'Changes save automatically',
  saving: 'Saving…',
  saved: 'Saved ✓ · live on your page',
  invalid: 'Check the highlighted field',
  error: 'Offline? Retrying…',
};

function combine(states: SaveState[]): SaveState {
  for (const s of ['error', 'invalid', 'saving', 'saved'] as const) if (states.includes(s)) return s;
  return 'idle';
}
