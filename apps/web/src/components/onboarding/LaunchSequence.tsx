// What the owner watches after pressing Publish. Every line is a real step: the
// publish call itself, then the API's launch check, which looks at the live page
// and the booking calendar. A tick lands when that step's answer comes back
// (held for a moment, so each line can be read), never on a timer alone.
import type { LaunchCheck, LaunchCheckStep } from '@bookpage/shared';
import { useEffect, useRef, useState } from 'preact/hooks';
import { renderSVG } from 'uqr';
import { Icon } from '../../site/parts';
import { api, ApiError } from './api';

/** Shortest time a step stays on screen, so a fast answer is still readable. */
export const MIN_STEP_MS = 650;

type Status = 'waiting' | 'running' | 'ok' | 'note' | 'fail';
type Step = { key: 'publish' | LaunchCheckStep; label: string; done: string };

export const LAUNCH_STEPS: Step[] = [
  { key: 'publish', label: 'Saving your page', done: 'Saved and published' },
  { key: 'layout', label: 'Checking it on phone and desktop', done: 'Looks right everywhere' },
  { key: 'secure', label: 'Securing your address', done: 'Address secured' },
  { key: 'search', label: 'Setting up search details', done: 'Search details ready' },
  { key: 'calendar', label: 'Opening your booking calendar', done: 'Booking calendar open' },
];

interface Row {
  status: Status;
  detail: string;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function LaunchSequence(props: {
  /** Publishes the page; resolves with the live slug. */
  publish: () => Promise<string>;
  /** The API refused to publish (address taken, something missing): back to the review step. */
  onRefused: (error: ApiError) => void;
  pageUrl: (slug: string) => string;
  /** Where the owner can get their own domain (Pro); null when they already have Pro. */
  upgradeHref: string | null;
  minStepMs?: number;
}) {
  const min = props.minStepMs ?? MIN_STEP_MS;
  const [rows, setRows] = useState<Row[]>(() => LAUNCH_STEPS.map(() => ({ status: 'waiting', detail: '' })));
  const [slug, setSlug] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const alive = useRef(true);
  const done = useRef<HTMLHeadingElement>(null);

  const set = (i: number, row: Row) => alive.current && setRows((all) => all.map((r, n) => (n === i ? row : r)));

  const run = async (from: number, live: string | null) => {
    for (let i = from; i < LAUNCH_STEPS.length; i++) {
      const step = LAUNCH_STEPS[i]!;
      set(i, { status: 'running', detail: '' });
      const started = Date.now();
      let row: Row;
      try {
        if (step.key === 'publish') {
          live = await props.publish();
          if (alive.current) setSlug(live);
          row = { status: 'ok', detail: '' };
        } else {
          const { check } = await api<{ check: LaunchCheck }>('GET', `/business/launch-check?step=${step.key}`);
          row = { status: check.status, detail: check.detail };
        }
      } catch (error) {
        if (step.key === 'publish' && error instanceof ApiError && [403, 409, 422].includes(error.status)) return props.onRefused(error);
        row = { status: 'fail', detail: step.key === 'publish' ? "Couldn't publish. Check your connection and try again." : "Couldn't run this check. Check your connection and try again." };
      }
      await wait(Math.max(0, min - (Date.now() - started)));
      if (!alive.current) return;
      set(i, row);
      if (row.status === 'fail') return;
    }
    if (!alive.current) return;
    setFinished(true);
    requestAnimationFrame(() => done.current?.focus());
  };

  useEffect(() => {
    run(0, null);
    return () => { alive.current = false; };
  }, []);

  const failedAt = rows.findIndex((r) => r.status === 'fail');
  const current = rows.findIndex((r) => r.status === 'running');

  return (
    <section class="ob-launch" aria-labelledby="ob-launch-title">
      {!finished ? (
        <>
          <h1 id="ob-launch-title" class="ob-title">{failedAt >= 0 ? 'Almost there' : 'Launching your page'}</h1>
          <p class="ob-intro">{failedAt >= 0 ? 'One step needs another go.' : 'This takes a few seconds. Each line ticks when it’s really done.'}</p>
        </>
      ) : (
        <>
          <span class="ob-stamp mono" aria-hidden="true"><Icon name="check" size={28} /> Live</span>
          <h1 id="ob-launch-title" ref={done} class="ob-title" tabIndex={-1}>You’re <span class="ob-scan">live</span>.</h1>
        </>
      )}

      <ol class="ob-launch-steps" aria-label="Launch steps">
        {LAUNCH_STEPS.map((step, i) => {
          const row = rows[i]!;
          return (
            <li class="ob-launch-step" data-status={row.status} aria-current={i === current ? 'step' : undefined}>
              <span class="ob-launch-mark" aria-hidden="true">
                {row.status === 'ok' && <Icon name="check" size={16} />}
                {row.status === 'note' && <Icon name="check" size={16} />}
                {row.status === 'fail' && '!'}
              </span>
              <span class="ob-launch-text">
                <strong>{row.status === 'ok' || row.status === 'note' ? step.done : step.label}</strong>
                <span class="visually-hidden">{({ waiting: ', waiting', running: ', in progress', ok: ', done', note: ', done', fail: ', needs attention' } as const)[row.status]}</span>
                {row.detail && <small>{row.detail}</small>}
              </span>
            </li>
          );
        })}
      </ol>
      <p class="visually-hidden" role="status" aria-live="polite">
        {finished ? 'Your page is live.' : current >= 0 ? `${LAUNCH_STEPS[current]!.label}…` : failedAt >= 0 ? `${LAUNCH_STEPS[failedAt]!.label} needs attention.` : ''}
      </p>

      {failedAt >= 0 && (
        <div class="ob-launch-actions">
          <button type="button" class="btn btn-primary" onClick={() => run(failedAt, slug)}>Try again</button>
          {/* The page is already live after the first step; a check that failed shouldn't trap the owner here. */}
          {slug && <button type="button" class="btn" onClick={() => setFinished(true)}>Skip this check</button>}
        </div>
      )}

      {finished && slug && <LiveCard url={props.pageUrl(slug)} upgradeHref={props.upgradeHref} />}
    </section>
  );
}

function LiveCard(props: { url: string; upgradeHref: string | null }) {
  const host = new URL(props.url).host;
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.url);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };
  const qr = renderSVG(props.url, { ecc: 'M', border: 2, whiteColor: '#FFFFFF', blackColor: '#0D0D10' });
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`You can now book with me online: ${props.url}`)}`;

  return (
    <div class="ob-live">
      <p class="ob-intro">Share it anywhere customers find you: your Instagram bio, WhatsApp status, Google profile.</p>
      <div class="ob-card ob-link-card">
        <a class="mono" href={props.url} target="_blank" rel="noopener">{host}</a>
        <button type="button" class="btn" onClick={copy}>{copied === 'ok' ? 'Copied' : 'Copy link'}</button>
      </div>
      <p class="ob-hint" role="status">{copied === 'fail' ? "Couldn't copy. Select the link and copy it yourself." : copied === 'ok' ? 'Link copied to your clipboard.' : ''}</p>
      <div class="ob-live-share">
        {/* Constant library output from the page's own URL. */}
        <span class="ob-live-qr" role="img" aria-label={`QR code for ${host}`} dangerouslySetInnerHTML={{ __html: qr }} />
        <div class="ob-done-actions">
          <a class="btn btn-primary" href={props.url} target="_blank" rel="noopener">Open my page <Icon name="arrow" size={16} /></a>
          <a class="btn" href={whatsapp} target="_blank" rel="noopener"><Icon name="chat" size={16} /> Share on WhatsApp</a>
          <a class="btn" href="/">Go to your dashboard</a>
        </div>
      </div>
      {props.upgradeHref && <p class="ob-live-pro">Want your own name, like <span class="mono">yourname.com</span>? <a href={props.upgradeHref}>Pro includes a domain for a year</a>.</p>}
    </div>
  );
}
