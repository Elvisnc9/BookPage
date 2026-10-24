// Building blocks every template composes. Server-rendered with no JS on the
// booking page; the same components render live in the onboarding preview.
import type { SiteImage } from '@bookpage/shared';
import type { ComponentChildren } from 'preact';
import type { SiteDay, SiteModel } from './model';

const PATHS = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  pin: '<path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  chat: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  bolt: '<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12.5h2M3 9h18"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
} as const;
export type IconName = keyof typeof PATHS;

/** Line icons on a 24px grid; stroke follows currentColor. */
export function Icon(props: { name: IconName; size?: number; class?: string }) {
  const size = props.size ?? 20;
  return (
    <svg class={props.class} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"
      // Constant markup from PATHS above, never data.
      dangerouslySetInnerHTML={{ __html: PATHS[props.name] }} />
  );
}

/**
 * An uploaded photo, or the template's fallback when there isn't one. In the
 * preview the fallback carries a "Placeholder" tag so the owner never mistakes
 * it for their own content; the live page shows the fallback alone.
 */
export function Photo(props: {
  site: SiteModel;
  img: SiteImage | null;
  alt: string;
  /** What to upload here, for the placeholder tag: "cover photo". */
  slot: string;
  class?: string | undefined;
  tint?: number | undefined;
  /** Letters drawn on the fallback. */
  mono?: string | undefined;
  eager?: boolean | undefined;
  sizes?: string | undefined;
  children?: ComponentChildren;
}) {
  const { img, site } = props;
  if (img) {
    return (
      <img class={`s-img ${props.class ?? ''}`} src={img.url} alt={props.alt} loading={props.eager ? 'eager' : 'lazy'} decoding="async"
        {...(img.width && img.height ? { width: img.width, height: img.height } : {})} {...(props.sizes ? { sizes: props.sizes } : {})} />
    );
  }
  return (
    <div class={`s-ph ${props.class ?? ''}`} data-tint={(props.tint ?? 0) % 6} aria-hidden="true">
      {props.mono && <span class="s-ph-mono">{props.mono}</span>}
      {props.children}
      {site.mode === 'preview' && <span class="s-ph-tag">Placeholder · add a {props.slot}</span>}
    </div>
  );
}

/** Text the owner hasn't written yet: a marked hint in the preview, nothing on the live page. */
export function Hint(props: { site: SiteModel; children: ComponentChildren; as?: 'p' | 'span' }) {
  if (props.site.mode !== 'preview') return null;
  const Tag = props.as ?? 'p';
  return <Tag class="s-hint">{props.children}</Tag>;
}

/** The business name, marked as a placeholder until the owner types one. */
export function Name(props: { site: SiteModel }) {
  return props.site.hasName ? <>{props.site.name}</> : <span class="s-hint-inline">{props.site.name}</span>;
}

export function Logo(props: { site: SiteModel; class?: string }) {
  const { site } = props;
  return (
    <span class={`s-logo ${props.class ?? ''}`} aria-hidden="true">
      {site.logo ? <img src={site.logo.url} alt="" width="40" height="40" /> : site.initials}
    </span>
  );
}

export function HoursList(props: { site: SiteModel; class?: string }) {
  return (
    <dl class={`s-hours ${props.class ?? ''}`}>
      {props.site.days.map((d: SiteDay) => (
        <div data-today={d.today || undefined} data-closed={d.closed || undefined}>
          <dt>{d.short}{d.today && <span class="s-sr"> (today)</span>}</dt>
          <dd>{d.text}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ContactList(props: { site: SiteModel; class?: string; icons?: boolean }) {
  const { site } = props;
  const icons = props.icons ?? true;
  const rows = [
    site.phone && { icon: 'phone' as const, href: site.phone.href, text: site.phone.label },
    site.whatsapp && { icon: 'chat' as const, href: site.whatsapp, text: 'WhatsApp' },
    site.email && { icon: 'mail' as const, href: `mailto:${site.email}`, text: site.email },
  ].filter((r) => !!r);
  if (!rows.length) return <Hint site={site}>Your phone and email appear here.</Hint>;
  return (
    <ul class={`s-contact ${props.class ?? ''}`}>
      {rows.map((r) => (
        <li>{icons && <Icon name={r.icon} size={18} />}<a href={r.href}>{r.text}</a></li>
      ))}
    </ul>
  );
}

export function FaqList(props: { site: SiteModel; class?: string }) {
  return (
    <div class={`s-faqs ${props.class ?? ''}`}>
      {props.site.faqs.map((f) => (
        <details class="s-faq">
          <summary>{f.question}<Icon name="plus" size={18} /></summary>
          <p>{f.answer}</p>
        </details>
      ))}
    </div>
  );
}

/** Where the business is, in one line. */
export function placeLine(site: SiteModel): string | null {
  if (site.onPremises) return site.address;
  if (site.locationType === 'online') return 'We meet online';
  return site.serviceAreas.length ? `We come to you in ${site.serviceAreas.join(', ')}` : 'We come to you';
}

/** The footer line: the BookPage badge (free plan only) and the privacy link (always). */
export function MadeWith(props: { site: SiteModel; class?: string }) {
  return (
    <p class={`s-made ${props.class ?? ''}`}>
      {props.site.showBadge && <>
        <a href="https://bookpage.app/?ref=page">Made with BookPage · Get your free page</a>
        <span aria-hidden="true"> · </span>
      </>}
      <a href="https://bookpage.app/privacy">Privacy</a>
    </p>
  );
}

/** A service-list placeholder for the preview before any service is complete. */
export function NoServices(props: { site: SiteModel }) {
  return <Hint site={props.site}>Your services appear here as you add them.</Hint>;
}

export const take = <T,>(list: T[], n: number) => list.slice(0, Math.max(0, n));
