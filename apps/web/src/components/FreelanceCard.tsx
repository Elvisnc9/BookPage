import { FREELANCE_COPY, FREELANCE_URL } from '../lib/freelance';

/**
 * "Talk to Elvis": the custom-design offer that sits after the templates. Pure
 * markup (no hooks), so Astro renders it as static HTML on the marketing page
 * and the onboarding island renders the same thing. Styles: styles/freelance.css.
 */
export function FreelanceCard(props: { class?: string }) {
  return (
    <aside class={`fl-card ${props.class ?? ''}`} aria-labelledby="fl-title">
      <div class="fl-swatches" aria-hidden="true">
        <span /><span /><span />
      </div>
      <div class="fl-copy">
        <p class="fl-tag">Custom design</p>
        <h2 id="fl-title" class="fl-title">{FREELANCE_COPY.title}</h2>
        <p class="fl-body">{FREELANCE_COPY.body}</p>
      </div>
      <a class="fl-cta" href={FREELANCE_URL} target="_blank" rel="noopener">
        {FREELANCE_COPY.action}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        <span class="fl-sr"> (opens in a new tab)</span>
      </a>
    </aside>
  );
}
