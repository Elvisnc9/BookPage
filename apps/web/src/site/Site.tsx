// The root of every rendered website: the published booking page (server
// rendering, no JS) and the onboarding preview (live in the owner app) both
// render <Site>, so they draw the same template with the same data.
import { CLASSIC_LAYOUT, CLASSIC_THEME, onAccent } from '@bookpage/shared';
import type { SiteModel } from './model';
import { rendererFor } from './registry';

export function Site({ site }: { site: SiteModel }) {
  const { slug, renderer, notice } = rendererFor(site.template);
  // A Classic stand-in uses Classic's own layout: another template's section list may not suit it.
  const model = notice ? { ...site, layout: CLASSIC_LAYOUT, theme: { ...CLASSIC_THEME, accent: site.theme.accent } } : site;
  const Template = renderer.component;
  return (
    <div class={`site t-${slug}`} data-template={slug} data-font={model.theme.font} data-mode={site.mode}
      style={{ '--accent': model.theme.accent, '--on-accent': onAccent(model.theme.accent) }}>
      <Template site={model} />
    </div>
  );
}
