import { isValidSlug, type OwnerBusiness, type PublishIssue, type ServiceInput } from '@bookpage/shared';
import { useEffect, useRef, useState } from 'preact/hooks';
import { api, ApiError } from './api';
import { type SaveState, useAutosave } from './autosave';
import {
  type AboutDraft, aboutFrom, aboutTo, type DayDraft, detectLocale, hoursFrom, hoursTo, needsAddress, needsAreas,
  type ServiceDraft, servicesFrom, serviceTo, type StaffDraft, staffFrom, suggestSlug,
} from './model';
import { Preview } from './Preview';
import { StepAbout } from './StepAbout';
import { StepBooking } from './StepBooking';
import { StepLook } from './StepLook';
import { Published, type SlugStatus, StepPublish } from './StepPublish';
import { StepServices } from './StepServices';

const STEPS = ['About', 'Services', 'Booking', 'Look', 'Publish'] as const;

export interface PageOrigin {
  protocol: string;
  rootDomain: string;
  port: string;
}

export default function Onboarding(props: { initial: OwnerBusiness | null; origin: PageOrigin }) {
  const [biz, setBiz] = useState<OwnerBusiness | null>(props.initial);
  const [loadError, setLoadError] = useState('');

  // First visit: create the draft, guessing country, currency and time zone from the browser.
  useEffect(() => {
    if (biz) return;
    api('PATCH', '/business', detectLocale()).then(setBiz, () => setLoadError("We couldn't start your page. Refresh to try again."));
  }, []);

  if (!biz) {
    return <p class="ob-loading mono" role="status">{loadError || 'Setting things up…'}</p>;
  }
  return <Wizard initial={biz} onBiz={setBiz} biz={biz} origin={props.origin} />;
}

function Wizard(props: { initial: OwnerBusiness; biz: OwnerBusiness; onBiz: (b: OwnerBusiness) => void; origin: PageOrigin }) {
  const { biz, onBiz, origin } = props;
  const [step, setStep] = useState(Math.min(props.initial.onboardingStep + 1, 5));
  const [about, setAbout] = useState<AboutDraft>(() => aboutFrom(props.initial));
  const [days, setDays] = useState<DayDraft[]>(() => hoursFrom(props.initial));
  const [services, setServices] = useState<ServiceDraft[]>(() => servicesFrom(props.initial));
  const [staff, setStaff] = useState<StaffDraft[]>(() => staffFrom(props.initial));
  const [rules, setRules] = useState(props.initial.rules);
  const [navError, setNavError] = useState('');

  // ─── Autosave, one saver per section ───────────────────────────────────
  const aboutSave = useAutosave<AboutDraft>(async (d) => onBiz(await api('PATCH', '/business', aboutTo(d))));
  const hoursSave = useAutosave<DayDraft[]>(async (d) => onBiz(await api('PUT', '/business/hours', hoursTo(d))));
  const rulesSave = useAutosave<OwnerBusiness['rules']>(async (r) => onBiz(await api('PATCH', '/business/rules', r)));

  // Only complete rows are sent; new rows get their server ids back by position.
  const servicesSave = useAutosave<ServiceDraft[]>(async (drafts) => {
    const sent: { key: string; input: ServiceInput }[] = [];
    for (const d of drafts) {
      const r = serviceTo(d);
      if ('input' in r) sent.push({ key: d.key, input: r.input });
    }
    const saved = await api('PUT', '/business/services', sent.map((s) => s.input));
    onBiz(saved);
    setServices((cur) => cur.map((d) => {
      const i = sent.findIndex((s) => s.key === d.key);
      return i >= 0 && !d.id ? { ...d, id: saved.services[i]?.id } : d;
    }));
  });
  const staffSave = useAutosave<StaffDraft[]>(async (drafts) => {
    const sent = drafts.filter((d) => d.name.trim());
    if (!sent.length) return;
    const saved = await api('PUT', '/business/staff', sent.map((d) => ({ ...(d.id ? { id: d.id } : {}), name: d.name.trim() })));
    onBiz(saved);
    setStaff((cur) => cur.map((d) => {
      const i = sent.findIndex((s) => s.key === d.key);
      return i >= 0 && !d.id ? { ...d, id: saved.staff[i]?.id } : d;
    }));
  });

  const savers = [aboutSave, hoursSave, servicesSave, staffSave, rulesSave];
  const saveState = combine(savers.map((s) => s.state));

  const editAbout = (patch: Partial<AboutDraft>) => setAbout((cur) => { const next = { ...cur, ...patch }; aboutSave.queue(next); return next; });
  const editDays = (next: DayDraft[]) => { setDays(next); hoursSave.queue(next); };
  const editServices = (next: ServiceDraft[]) => { setServices(next); servicesSave.queue(next); };
  const editStaff = (next: StaffDraft[]) => { setStaff(next); staffSave.queue(next); };
  const editRules = (patch: Partial<OwnerBusiness['rules']>) => setRules((cur) => { const next = { ...cur, ...patch }; rulesSave.queue(next); return next; });

  // ─── Publish: address availability ───────────────────────────────────────
  const [slug, setSlug] = useState(() => (biz.slug.startsWith('draft-') ? '' : biz.slug));
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('checking');
  const [serverIssues, setServerIssues] = useState<PublishIssue[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<string | null>(null);
  const slugCheck = useRef(0);

  useEffect(() => {
    if (step === 5 && !slug) setSlug(suggestSlug(about.name));
  }, [step]);

  useEffect(() => {
    if (step !== 5 || !slug) return;
    if (!isValidSlug(slug)) return setSlugStatus('invalid');
    setSlugStatus('checking');
    const ticket = ++slugCheck.current;
    const timer = setTimeout(async () => {
      try {
        const r = await api<{ available: boolean }>('GET', `/business/slug-available?slug=${encodeURIComponent(slug)}`);
        if (ticket === slugCheck.current) setSlugStatus(r.available ? 'available' : 'taken');
      } catch {
        if (ticket === slugCheck.current) setSlugStatus('invalid');
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [slug, step]);

  // ─── Step gating, mirroring the design ──────────────────────────────────
  const stepProblem = (s: number): string => {
    if (s === 1) {
      if (!about.category) return 'Pick what kind of business you are';
      if (!about.name.trim()) return 'Add your business name';
      if (!about.phone.trim()) return 'Add a phone number';
      if (needsAddress(about.locationType) && (!about.addressLine1.trim() || !about.city.trim())) return 'Add your street address and city';
      if (needsAreas(about.locationType) && about.serviceAreas.length === 0) return 'Add at least one area you travel to';
      if (!days.some((d) => d.open)) return 'Open at least one day';
    }
    if (s === 2 && !services.some((d) => 'input' in serviceTo(d))) return 'Add at least one service with a name and price';
    if (s === 3 && !staff.some((p) => p.name.trim())) return 'Add at least one person who takes bookings';
    if (s === 5 && slugStatus !== 'available') return 'Choose an available address';
    return '';
  };

  const goTo = (n: number) => {
    setNavError('');
    setServerIssues([]);
    setStep(n);
    window.scrollTo({ top: 0 });
  };

  const next = async () => {
    const problem = stepProblem(step);
    if (problem) return setNavError(problem);
    await Promise.all(savers.map((s) => s.now()));
    if (savers.some((s) => s.state === 'invalid')) return setNavError('Fix the highlighted fields first');

    if (step < 5) {
      if (biz.onboardingStep < step) onBiz(await api('PATCH', '/business', { onboardingStep: step }));
      return goTo(step + 1);
    }

    setPublishing(true);
    try {
      const live = await api('POST', '/business/publish', { slug });
      onBiz(live);
      setPublished(live.slug);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setSlugStatus('taken');
      else if (error instanceof ApiError && error.status === 422) setServerIssues(error.issues as unknown as PublishIssue[]);
      else setNavError("Couldn't publish. Check your connection and try again.");
    } finally {
      setPublishing(false);
    }
  };

  if (published) {
    const host = `${published}.${origin.rootDomain}${origin.port ? `:${origin.port}` : ''}`;
    return <Published url={`${origin.protocol}//${host}`} host={host} />;
  }

  const furthest = Math.min(biz.onboardingStep + 1, 5);
  return (
    <div class="ob">
      <nav class="ob-progress" aria-label="Onboarding steps">
        <ol>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n === step ? 'current' : n <= furthest ? 'done' : 'todo';
            return (
              <li>
                <button type="button" class="ob-step mono" data-state={state} disabled={n > furthest}
                  aria-current={n === step ? 'step' : undefined} onClick={() => goTo(n)}>
                  <span aria-hidden="true">{state === 'done' ? '✓' : state === 'current' ? '■' : '□'}</span> {label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div class="ob-body">
        <form class="ob-form" onSubmit={(e) => { e.preventDefault(); void next(); }} noValidate>
          {step === 1 && <StepAbout about={about} onAbout={editAbout} issues={aboutSave.issues} days={days} onDays={editDays} />}
          {step === 2 && <StepServices services={services} onServices={editServices} category={about.category} currency={about.currency} />}
          {step === 3 && <StepBooking rules={rules} onRules={editRules} staff={staff} onStaff={editStaff} />}
          {step === 4 && <StepLook />}
          {step === 5 && (
            <StepPublish biz={biz} slug={slug} onSlug={setSlug} slugStatus={slugStatus} rootDomain={origin.rootDomain}
              serverIssues={serverIssues} onGoTo={goTo} />
          )}

          <div class="ob-nav">
            {step > 1 ? <button type="button" class="btn" onClick={() => goTo(step - 1)}>← Back</button> : <span />}
            <p class={`ob-status mono ${navError ? 'bad' : saveState === 'error' ? 'bad' : ''}`} role="status" aria-live="polite">
              {navError || STATUS_TEXT[saveState]}
            </p>
            <button type="submit" class="btn btn-ink" disabled={publishing}>
              {step === 5 ? (publishing ? 'Publishing…' : 'Publish my page →') : 'Continue →'}
            </button>
          </div>
        </form>

        {step <= 3 && <Preview about={about} services={services} />}
      </div>
    </div>
  );
}

const STATUS_TEXT: Record<SaveState, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved ✓',
  invalid: 'Check the highlighted field',
  error: 'Offline? Retrying…',
};

/** The most important state across all savers. */
function combine(states: SaveState[]): SaveState {
  for (const s of ['error', 'invalid', 'saving', 'saved'] as const) if (states.includes(s)) return s;
  return 'idle';
}
