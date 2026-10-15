import { CATEGORIES, type CategoryKey, type OwnerBusiness, type PublishIssue, publishIssues, WEEKDAY_SHORT } from '@bookpage/shared';
import { Field, Section } from './ui';

export type SlugStatus = 'checking' | 'available' | 'taken' | 'invalid';

export function StepPublish(props: {
  biz: OwnerBusiness;
  slug: string;
  onSlug: (slug: string) => void;
  slugStatus: SlugStatus;
  rootDomain: string;
  serverIssues: PublishIssue[];
  onGoTo: (step: number) => void;
}) {
  const { biz } = props;
  const issues = props.serverIssues.length ? props.serverIssues : publishIssues(biz);
  const openDays = biz.hours.map((h) => WEEKDAY_SHORT[h.weekday - 1]).filter((d, i, all) => all.indexOf(d) === i);
  const where =
    biz.locationType === 'online' ? 'Online'
    : biz.locationType === 'mobile' ? `Travels to ${biz.serviceAreas.join(', ') || '—'}`
    : [biz.addressLine1, biz.city].filter(Boolean).join(', ') || '—';

  const summary = [
    { k: 'Business', v: `${biz.name || '—'} · ${biz.category ? CATEGORIES[biz.category as CategoryKey].label : '—'}`, step: 1 },
    { k: 'Location', v: where, step: 1 },
    { k: 'Open', v: openDays.length ? openDays.join(', ') : 'No days yet', step: 1 },
    { k: 'Services', v: `${biz.services.length} added`, step: 2 },
    { k: 'Team', v: biz.staff.map((s) => s.name).join(', '), step: 3 },
  ];

  const note = {
    checking: { text: 'Checking…', tone: '' },
    available: { text: `✓ ${props.slug}.${props.rootDomain} is available`, tone: 'ok' },
    taken: { text: `× ${props.slug}.${props.rootDomain} is taken`, tone: 'bad' },
    invalid: { text: 'Use 3–40 letters, numbers or single hyphens', tone: 'bad' },
  }[props.slugStatus];

  return (
    <Section kicker="Step 5 · Publish" title="Go live" intro="Pick your page's address. This is the link you'll share.">
      <Field label="Your page address">
        {(id) => (
          <div class="ob-slug">
            <input id={id} class="ob-input mono" value={props.slug} maxLength={40} autoCapitalize="off" autoCorrect="off" spellcheck={false}
              aria-describedby={`${id}-status`}
              onInput={(e) => props.onSlug(e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
            <span class="mono">.{props.rootDomain}</span>
          </div>
        )}
      </Field>
      <p class={`ob-slug-note mono ${note.tone}`} role="status">{note.text}</p>

      <dl class="ob-summary box">
        {summary.map((row) => (
          <div>
            <dt class="lab">{row.k}</dt>
            <dd>{row.v}</dd>
            <button type="button" class="ob-link" onClick={() => props.onGoTo(row.step)}>Edit</button>
          </div>
        ))}
      </dl>

      {issues.length > 0 && (
        <div class="ob-issues" role="alert">
          <p><strong>Before you publish:</strong></p>
          <ul>
            {issues.map((i) => (
              <li>
                <button type="button" class="ob-link" onClick={() => props.onGoTo(i.step)}>{i.message}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

export function Published(props: { url: string; host: string }) {
  const copy = async (e: Event) => {
    const button = e.currentTarget as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(props.url);
      button.textContent = 'Copied ✓';
    } catch {
      button.textContent = 'Copy failed';
    }
  };
  return (
    <section class="ob-section ob-done" aria-labelledby="ob-done-title">
      <p class="lab">You're live</p>
      <h1 id="ob-done-title" class="h-display">Your page is <span class="scan">live.</span></h1>
      <p class="ob-intro">Share this link anywhere customers find you: your bio, WhatsApp status, Google profile.</p>
      <div class="box raised ob-link-card">
        <a class="mono" href={props.url} target="_blank" rel="noopener">{props.host}</a>
        <button type="button" class="btn btn-ink" onClick={copy}>Copy link</button>
      </div>
      <a class="btn" href="/">Go to your dashboard →</a>
    </section>
  );
}
