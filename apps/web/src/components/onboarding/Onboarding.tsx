import { isValidSlug, ONBOARDING_STEPS, type OwnerBusiness, type PublishIssue, type ServiceInput, type SiteTemplate } from '@bookpage/shared';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { buildSite } from '../../site/model';
import { Icon } from '../../site/parts';
import { api, ApiError } from './api';
import { type SaveState, useAutosave } from './autosave';
import {
  type AboutDraft, aboutFrom, aboutTo, type DayDraft, type DesignDraft, designFrom, detectLocale, draftSite, hoursFrom, hoursTo,
  type ListEdit, needsAddress, needsAreas, previewBusiness, type ServiceDraft, servicesFrom, serviceTo, type StaffDraft, staffFrom, suggestSlug,
} from './model';
import { type Device, PreviewPanel, PreviewSheet } from './Preview';
import { StepAbout } from './StepAbout';
import { StepBooking } from './StepBooking';
import { Published, type SlugStatus, StepPublish } from './StepPublish';
import { StepServices } from './StepServices';
import { StepTemplate } from './StepTemplate';

export interface PageOrigin {
  protocol: string;
  rootDomain: string;
  port: string;
}

export default function Onboarding(props: { initial: OwnerBusiness | null; templates: SiteTemplate[]; origin: PageOrigin }) {
  const [biz, setBiz] = useState<OwnerBusiness | null>(props.initial);
  const [loadError, setLoadError] = useState('');

  // First visit: create the draft, guessing country, currency and time zone from the browser.
  useEffect(() => {
    if (biz) return;
    api('PATCH', '/business', detectLocale()).then(setBiz, () => setLoadError("We couldn't start your page. Refresh to try again."));
  }, []);

  if (!biz) {
    return (
      <div class="ob-boot" role="status">
        <span class="ob-boot-mark" aria-hidden="true" />
        <p class="mono">{loadError || 'Setting up your page…'}</p>
      </div>
    );
  }
  return <Wizard initial={biz} templates={props.templates} origin={props.origin} />;
}

function Wizard(props: { initial: OwnerBusiness; templates: SiteTemplate[]; origin: PageOrigin }) {
  const { templates, origin } = props;
  // `biz` is the server's copy (the single source of truth); the drafts below are edits on their way to it.
  const [biz, setBiz] = useState(props.initial);
  const [step, setStep] = useState(Math.min(props.initial.onboardingStep + 1, 5));
  const [dir, setDir] = useState<1 | -1>(1);
  const [about, setAbout] = useState<AboutDraft>(() => aboutFrom(props.initial));
  const [days, setDays] = useState<DayDraft[]>(() => hoursFrom(props.initial));
  const [services, setServices] = useState<ServiceDraft[]>(() => servicesFrom(props.initial));
  const [staff, setStaff] = useState<StaffDraft[]>(() => staffFrom(props.initial));
  const [rules, setRules] = useState(props.initial.rules);
  const [design, setDesign] = useState<DesignDraft>(() => designFrom(props.initial));
  const [device, setDevice] = useState<Device>('desktop');
  const [sheet, setSheet] = useState(false);
  const [navError, setNavError] = useState('');
  const [elsewhere, setElsewhere] = useState<OwnerBusiness | null>(null);
  const seen = useRef(props.initial.updatedAt);

  const onBiz = (b: OwnerBusiness) => {
    seen.current = b.updatedAt;
    setBiz(b);
  };

  // ─── Autosave, one saver per section ───────────────────────────────────
  const aboutSave = useAutosave<AboutDraft>(async (d) => onBiz(await api('PATCH', '/business', aboutTo(d))));
  const hoursSave = useAutosave<DayDraft[]>(async (d) => onBiz(await api('PUT', '/business/hours', hoursTo(d))));
  const rulesSave = useAutosave<OwnerBusiness['rules']>(async (r) => onBiz(await api('PATCH', '/business/rules', r)));
  const designSave = useAutosave<DesignDraft>(
    async (d) => onBiz(await api('PATCH', '/business', { ...(d.templateId ? { templateId: d.templateId } : {}), theme: d.theme })),
    250,
  );

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

  const savers = [designSave, aboutSave, hoursSave, servicesSave, staffSave, rulesSave];
  const saveState = combine(savers.map((s) => s.state));
  const flushAll = () => Promise.all(savers.map((s) => s.now()));

  // A "fix this first" message goes away as soon as the owner starts fixing things.
  useEffect(() => { if (navError) setNavError(''); }, [about, days, services, staff, rules, design]);

  const editAbout = (patch: Partial<AboutDraft>) => setAbout((cur) => { const next = { ...cur, ...patch }; aboutSave.queue(next); return next; });
  const editDays: ListEdit<DayDraft> = (update) => setDays((cur) => { const next = update(cur); hoursSave.queue(next); return next; });
  const editServices: ListEdit<ServiceDraft> = (update) => setServices((cur) => { const next = update(cur); servicesSave.queue(next); return next; });
  const editStaff: ListEdit<StaffDraft> = (update) => setStaff((cur) => { const next = update(cur); staffSave.queue(next); return next; });
  const editRules = (patch: Partial<OwnerBusiness['rules']>) => setRules((cur) => { const next = { ...cur, ...patch }; rulesSave.queue(next); return next; });
  const editDesign = (patch: Partial<DesignDraft>) => setDesign((cur) => { const next = { ...cur, ...patch }; designSave.queue(next); return next; });

  // ─── One model for the preview, the review step and (via the API) the live page ───
  const resolved = useMemo(() => draftSite(templates, design, biz), [templates, design, biz]);
  const site = useMemo(
    () => buildSite(previewBusiness({ saved: biz, about, days, services, staff, site: resolved }), 'preview'),
    [biz, about, days, services, staff, resolved],
  );

  // ─── Edits from another tab or device ────────────────────────────────────
  // When the owner comes back to this tab, check the server copy. If it moved on
  // without us, offer to load it rather than silently overwriting either side.
  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { business } = await api<{ business: OwnerBusiness | null }>('GET', '/business');
        if (business && business.updatedAt > seen.current) setElsewhere(business);
      } catch { /* offline: the savers will say so */ }
    };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);
  const loadElsewhere = () => {
    if (!elsewhere) return;
    onBiz(elsewhere);
    setAbout(aboutFrom(elsewhere));
    setDays(hoursFrom(elsewhere));
    setServices(servicesFrom(elsewhere));
    setStaff(staffFrom(elsewhere));
    setRules(elsewhere.rules);
    setDesign(designFrom(elsewhere));
    setElsewhere(null);
  };

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

  // ─── Step gating ─────────────────────────────────────────────────────────
  const stepProblem = (s: number): string => {
    if (s === 1 && biz.site.notice && design.templateId === biz.templateId) return 'Pick one of the available templates';
    if (s === 2) {
      if (!about.name.trim()) return 'Add your business name';
      if (!about.category) return 'Pick what kind of business you are';
      if (!about.phone.trim()) return 'Add a phone number';
      if (needsAddress(about.locationType) && (!about.addressLine1.trim() || !about.city.trim())) return 'Add your street address and city';
      if (needsAreas(about.locationType) && about.serviceAreas.length === 0) return 'Add at least one area you travel to';
    }
    if (s === 3 && !services.some((d) => 'input' in serviceTo(d))) return 'Add at least one service with a name and price';
    if (s === 4) {
      if (!days.some((d) => d.open)) return 'Open at least one day';
      if (!staff.some((p) => p.name.trim())) return 'Add at least one person who takes bookings';
    }
    if (s === 5 && slugStatus !== 'available') return 'Choose an available address';
    return '';
  };

  const heading = useRef<HTMLDivElement>(null);
  const goTo = (n: number) => {
    setNavError('');
    setServerIssues([]);
    setDir(n >= step ? 1 : -1);
    setStep(n);
    window.scrollTo({ top: 0 });
    // Move focus to the new step's heading so keyboard and screen-reader users land at the top.
    requestAnimationFrame(() => heading.current?.querySelector<HTMLElement>('#ob-step-title')?.focus({ preventScroll: true }));
  };

  const next = async () => {
    const problem = stepProblem(step);
    if (problem) return setNavError(problem);
    await flushAll();
    if (savers.some((s) => s.state === 'invalid')) return setNavError('Fix the highlighted fields first');
    if (savers.some((s) => s.state === 'error')) return setNavError("We couldn't save your last changes. Check your connection, then try again.");

    if (step < 5) {
      try {
        if (biz.onboardingStep < step) onBiz(await api('PATCH', '/business', { onboardingStep: step }));
      } catch {
        return setNavError("We couldn't save your progress. Check your connection and try again.");
      }
      return goTo(step + 1);
    }

    setPublishing(true);
    try {
      const live = await api('POST', '/business/publish', { slug });
      onBiz(live);
      setPublished(live.slug);
      window.scrollTo({ top: 0 });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setSlugStatus('taken');
      else if (error instanceof ApiError && error.status === 422) setServerIssues(error.issues as unknown as PublishIssue[]);
      else setNavError("Couldn't publish. Check your connection and try again.");
    } finally {
      setPublishing(false);
    }
  };

  const logout = useRef<HTMLFormElement>(null);
  const finishLater = async () => {
    await flushAll();
    logout.current?.submit();
  };

  const domain = `${origin.rootDomain}${origin.port ? `:${origin.port}` : ''}`;
  if (published) {
    const host = `${published}.${domain}`;
    return <div class="ob-shell ob-shell-done"><Published url={`${origin.protocol}//${host}`} host={host} /></div>;
  }

  const furthest = Math.min(biz.onboardingStep + 1, 5);
  const host = `${slug || suggestSlug(about.name) || 'yourname'}.${origin.rootDomain}`;
  const preview = (onClose?: () => void) => (
    <PreviewPanel site={site} host={host} device={onClose ? 'phone' : device} onDevice={setDevice} saving={saveState === 'saving'} onClose={onClose} />
  );

  return (
    <div class="ob-app">
      <header class="ob-top">
        <a class="ob-brand" href="/" aria-label="BookPage">
          <span class="ob-logo" aria-hidden="true"><i /><i /><i /><i /></span>
          <span class="ob-brand-name">BookPage</span>
        </a>
        <nav class="ob-steps" aria-label="Setup steps">
          <p class="ob-steps-compact mono" aria-hidden="true">{step}/5 · {ONBOARDING_STEPS[step - 1]}</p>
          <ol style={{ '--done': (Math.min(furthest, 5) - 1) / 4 }}>
            {ONBOARDING_STEPS.map((label, i) => {
              const n = i + 1;
              const state = n === step ? 'current' : n < furthest ? 'done' : n === furthest ? 'open' : 'todo';
              return (
                <li data-state={state}>
                  <button type="button" disabled={n > furthest} aria-current={n === step ? 'step' : undefined} onClick={() => goTo(n)}>
                    <span class="ob-step-dot mono" aria-hidden="true">{state === 'done' ? <Icon name="check" size={14} /> : n}</span>
                    <span class="ob-step-label">{label}</span>
                    {state === 'done' && <span class="ob-sr"> (done)</span>}
                  </button>
                </li>
              );
            })}
          </ol>
          <span class="ob-steps-bar" aria-hidden="true"><i style={{ transform: `scaleX(${step / 5})` }} /></span>
        </nav>
        <SavePill state={saveState} onRetry={() => void flushAll()} />
        <button type="button" class="ob-later" onClick={() => void finishLater()}>
          <span class="ob-later-long">Save and finish later</span><span class="ob-later-short">Later</span>
        </button>
        <form ref={logout} method="post" action="/api/auth/logout" hidden />
      </header>

      {elsewhere && (
        <div class="ob-banner" role="alert">
          <p>This page was changed in another tab or on another device.</p>
          <button type="button" class="btn btn-ink" onClick={loadElsewhere}>Load the latest</button>
          <button type="button" class="btn" onClick={() => setElsewhere(null)}>Keep mine</button>
        </div>
      )}

      <div class="ob-shell">
        <form class="ob-form" onSubmit={(e) => { e.preventDefault(); void next(); }} noValidate>
          <div class="ob-step" key={step} data-dir={dir} ref={heading}>
            {step === 1 && <StepTemplate templates={templates} design={design} onDesign={editDesign} notice={design.templateId === biz.templateId ? biz.site.notice : null} />}
            {step === 2 && <StepAbout about={about} onAbout={editAbout} issues={aboutSave.issues} biz={biz} onBiz={onBiz} />}
            {step === 3 && <StepServices services={services} onServices={editServices} category={about.category} currency={about.currency} media={{ biz, onBiz }} />}
            {step === 4 && <StepBooking rules={rules} onRules={editRules} staff={staff} onStaff={editStaff} hours={{ days, onDays: editDays }} media={{ biz, onBiz }} />}
            {step === 5 && (
              <StepPublish biz={biz} site={site} slug={slug} onSlug={setSlug} slugStatus={slugStatus} rootDomain={origin.rootDomain}
                serverIssues={serverIssues} onGoTo={goTo} />
            )}
          </div>

          <div class="ob-nav">
            {step > 1 ? <button type="button" class="btn" onClick={() => goTo(step - 1)}><Icon name="back" size={16} /> Back</button> : <span />}
            <button type="button" class="btn ob-nav-preview" onClick={() => setSheet(true)}>Preview</button>
            <p class={`ob-nav-msg${navError ? ' bad' : ''}`} role="status" aria-live="polite">{navError}</p>
            <button type="submit" class="btn btn-ink ob-continue" disabled={publishing} data-busy={publishing || undefined}>
              {step === 5 ? (publishing ? 'Publishing…' : 'Publish my page') : `Continue to ${ONBOARDING_STEPS[step]!.toLowerCase()}`}
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </form>

        <aside class="ob-aside">{preview()}</aside>
      </div>

      <PreviewSheet open={sheet} onClose={() => setSheet(false)}>{preview(() => setSheet(false))}</PreviewSheet>
    </div>
  );
}

const SAVE_TEXT: Record<SaveState, string> = {
  idle: 'All changes saved',
  saving: 'Saving…',
  saved: 'Saved',
  invalid: 'Check the highlighted field',
  error: 'Not saved yet',
};

/** Save status, announced politely. Errors keep retrying on their own; Retry forces it now. */
function SavePill(props: { state: SaveState; onRetry: () => void }) {
  return (
    <div class="ob-save" data-state={props.state}>
      <span class="ob-save-icon" aria-hidden="true">
        {props.state === 'saving' ? <i class="ob-spin" /> : props.state === 'error' || props.state === 'invalid' ? <i class="ob-bang" /> : <Icon name="check" size={14} />}
      </span>
      <span role="status" aria-live="polite" class="ob-save-text">{SAVE_TEXT[props.state]}</span>
      {props.state === 'error' && <button type="button" class="ob-link" onClick={props.onRetry}>Retry</button>}
    </div>
  );
}

/** The most important state across all savers. */
function combine(states: SaveState[]): SaveState {
  for (const s of ['error', 'invalid', 'saving', 'saved'] as const) if (states.includes(s)) return s;
  return 'idle';
}
