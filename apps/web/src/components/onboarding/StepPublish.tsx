import { type OwnerBusiness, type PublishIssue, publishIssues, SITE_FONTS } from '@bookpage/shared';
import { useState } from 'preact/hooks';
import type { SiteModel } from '../../site/model';
import { Icon } from '../../site/parts';
import { Card, Field, Section } from './ui';

export type SlugStatus = 'checking' | 'available' | 'taken' | 'invalid';

export function StepPublish(props: {
  biz: OwnerBusiness;
  site: SiteModel;
  slug: string;
  onSlug: (slug: string) => void;
  slugStatus: SlugStatus;
  rootDomain: string;
  serverIssues: PublishIssue[];
  onGoTo: (step: number) => void;
}) {
  const { biz, site } = props;
  const issues = props.serverIssues.length ? props.serverIssues : [
    ...(biz.site.notice ? [{ step: 1 as const, message: 'Pick one of the available templates' }] : []),
    ...publishIssues(biz),
  ];
  const openDays = site.days.filter((d) => !d.closed);
  const m = biz.rules.minNoticeMin;
  const notice = m === 0 ? 'No minimum notice' : `At least ${m % 60 === 0 ? `${m / 60} hour${m === 60 ? '' : 's'}` : `${m} minutes`} notice`;

  const note = {
    checking: { text: 'Checking…', tone: '' },
    available: { text: `${props.slug}.${props.rootDomain} is yours`, tone: 'ok' },
    taken: { text: `${props.slug}.${props.rootDomain} is taken. Try another.`, tone: 'bad' },
    invalid: { text: 'Use 3–40 letters, numbers or single hyphens', tone: 'bad' },
  }[props.slugStatus];

  const Edit = (p: { step: number; what: string }) => (
    <button type="button" class="ob-edit" onClick={() => props.onGoTo(p.step)} aria-label={`Edit ${p.what}`}>Edit</button>
  );

  return (
    <Section title="Review and publish" scan="publish" intro="Check the details, pick your address, and go live. You can change everything later.">
      {issues.length > 0 ? (
        <div class="ob-ready" data-ready="false" role="alert">
          <strong>A few things before you publish</strong>
          <ul>
            {issues.map((i) => <li><button type="button" class="ob-link" onClick={() => props.onGoTo(i.step)}>{i.message}</button></li>)}
          </ul>
        </div>
      ) : (
        <div class="ob-ready" data-ready="true">
          <span class="ob-ready-icon" aria-hidden="true"><Icon name="check" size={22} /></span>
          <div><strong>Your page is ready</strong><p>Everything customers need is in place.</p></div>
        </div>
      )}

      <Card title="Your address" hint="The link you'll share in your bio, on WhatsApp and on Google.">
        <Field label="Page address">
          {(id) => (
            <div class="ob-slug">
              <input id={id} class="ob-input mono" value={props.slug} maxLength={40} autoCapitalize="off" autoCorrect="off" spellcheck={false}
                aria-describedby={`${id}-status`}
                onInput={(e) => props.onSlug(e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
              <span class="mono">.{props.rootDomain}</span>
            </div>
          )}
        </Field>
        <p class={`ob-slug-note mono ${note.tone}`} role="status">{note.tone === 'ok' && <Icon name="check" size={14} />}{note.text}</p>
      </Card>

      <div class="ob-review">
        <div class="ob-card ob-review-card">
          <div class="ob-review-head"><h2 class="ob-card-title">Design</h2><Edit step={1} what="design" /></div>
          <div class="ob-review-design">
            <span class="ob-review-swatch" style={{ background: site.theme.accent }} aria-hidden="true" />
            <span><strong>{site.template.name}</strong><small>{SITE_FONTS[site.theme.font].label} headings · {site.theme.accent}</small></span>
          </div>
          <div class="ob-review-thumbs">
            {[biz.logo, biz.hero, ...biz.gallery].filter((x) => !!x).slice(0, 5).map((m) => <img src={m!.url} alt="" />)}
            {!biz.logo && !biz.hero && biz.gallery.length === 0 && <p class="ob-hint">No photos yet: placeholders stay off your live page.</p>}
          </div>
        </div>

        <div class="ob-card ob-review-card">
          <div class="ob-review-head"><h2 class="ob-card-title">Business</h2><Edit step={2} what="business details" /></div>
          <dl class="ob-dl">
            <div><dt>Name</dt><dd>{site.hasName ? site.name : 'Not set'}</dd></div>
            <div><dt>Kind</dt><dd>{site.categoryLabel ?? 'Not set'}</dd></div>
            <div><dt>Where</dt><dd>{site.onPremises ? site.address : site.area ?? 'Not set'}</dd></div>
            <div><dt>Contact</dt><dd>{[site.phone?.label, site.email].filter(Boolean).join(' · ') || 'Not set'}</dd></div>
          </dl>
        </div>

        <div class="ob-card ob-review-card">
          <div class="ob-review-head"><h2 class="ob-card-title">Services <span class="ob-count">{site.services.length}</span></h2><Edit step={3} what="services" /></div>
          <ul class="ob-review-services">
            {site.services.slice(0, 5).map((s) => (
              <li>
                {s.image ? <img src={s.image.url} alt="" /> : <span class="ob-review-mono" aria-hidden="true">{s.initials}</span>}
                <span><strong>{s.name}</strong><small>{[s.price, s.duration].filter(Boolean).join(' · ')}</small></span>
              </li>
            ))}
            {site.services.length > 5 && <li class="ob-hint">and {site.services.length - 5} more</li>}
          </ul>
        </div>

        <div class="ob-card ob-review-card">
          <div class="ob-review-head"><h2 class="ob-card-title">Booking</h2><Edit step={4} what="booking settings" /></div>
          <dl class="ob-dl">
            <div><dt>Open</dt><dd>{openDays.length ? openDays.map((d) => d.short).join(', ') : 'No days yet'}</dd></div>
            <div><dt>Rules</dt><dd>{notice}, up to {biz.rules.windowDays} days ahead</dd></div>
            <div><dt>Team</dt><dd>{site.team.map((p) => p.name).join(', ') || 'Nobody yet'}</dd></div>
            <div><dt>Confirm</dt><dd>{biz.rules.autoConfirm ? 'Automatically' : 'You approve each booking'}</dd></div>
          </dl>
        </div>
      </div>
    </Section>
  );
}

export function Published(props: { url: string; host: string }) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.url);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };
  return (
    <section class="ob-done" aria-labelledby="ob-done-title">
      <span class="ob-stamp mono" aria-hidden="true"><Icon name="check" size={28} /> Live</span>
      <h1 id="ob-done-title" class="ob-title" tabIndex={-1}>Your page is <span class="ob-scan">live</span>.</h1>
      <p class="ob-intro">Share it anywhere customers find you: your Instagram bio, WhatsApp status, Google profile.</p>
      <div class="ob-card ob-link-card">
        <a class="mono" href={props.url} target="_blank" rel="noopener">{props.host}</a>
        <button type="button" class="btn btn-ink" onClick={copy}>{copied === 'ok' ? 'Copied' : 'Copy link'}</button>
      </div>
      <p class="ob-hint" role="status">{copied === 'fail' ? "Couldn't copy. Select the link and copy it yourself." : copied === 'ok' ? 'Link copied to your clipboard.' : ''}</p>
      <div class="ob-done-actions">
        <a class="btn btn-ink" href={props.url} target="_blank" rel="noopener">Open my page <Icon name="arrow" size={16} /></a>
        <a class="btn" href="/">Go to your dashboard</a>
      </div>
    </section>
  );
}
