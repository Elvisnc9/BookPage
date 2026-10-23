import { ACCENT_SWATCHES, canUseTemplate, mergeTheme, noticeText, type Plan, SITE_FONT_KEYS, SITE_FONTS, type SiteTemplate, type SiteTheme, TEMPLATE_GROUPS, type TemplateGroup, type TemplateNotice } from '@bookpage/shared';
import { Fragment } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { buildSite } from '../../site/model';
import { Icon } from '../../site/parts';
import { Site } from '../../site/Site';
import { FreelanceCard } from '../FreelanceCard';
import type { DesignDraft } from './model';
import { Scaled } from './Preview';
import { sampleBusiness } from './samples';
import { Section } from './ui';

export function StepTemplate(props: {
  templates: SiteTemplate[];
  design: DesignDraft;
  onDesign: (patch: Partial<DesignDraft>) => void;
  /** The server could not use the saved pick (retired, invalid, locked…). */
  notice: TemplateNotice | null;
  plan: Plan;
  /** A Pro template the owner is looking at in the preview without having picked it. */
  previewing: string | null;
  onPreview: (templateId: string | null) => void;
  /** Where "Unlock with Pro" goes (the pricing page, until checkout exists). */
  proUrl: string;
}) {
  const { templates, design } = props;
  const [group, setGroup] = useState<TemplateGroup | 'all'>('all');
  const groups = TEMPLATE_GROUPS_IN(templates);
  const shown = group === 'all' ? templates : templates.filter((t) => t.category === group);
  const selected = templates.find((t) => t.id === design.templateId) ?? templates.find((t) => t.slug === 'classic') ?? templates[0];
  const theme = selected ? mergeTheme(selected.defaultTheme, design.theme) : null;

  // The owner's own colour and font carry over to the new template; "default" follows each template.
  const pick = (t: SiteTemplate) => {
    props.onPreview(null);
    props.onDesign({ templateId: t.id });
  };
  const peeking = props.previewing ? templates.find((t) => t.id === props.previewing) ?? null : null;

  return (
    <Section title="Pick a look" scan="look" intro="Each template lays out the same details differently. Switch any time: your text, services and photos stay as they are.">
      {props.notice && <p class="ob-notice" role="status">{noticeText(props.notice)}</p>}

      {groups.length > 1 && (
        <div class="ob-filters" role="group" aria-label="Filter templates">
          {(['all', ...groups] as const).map((g) => (
            <button type="button" class="ob-filter" aria-pressed={group === g} onClick={() => setGroup(g)}>
              {g === 'all' ? 'All' : TEMPLATE_GROUPS[g]}
            </button>
          ))}
        </div>
      )}

      <fieldset class="ob-gallery">
        <legend class="ob-sr">Templates</legend>
        {shown.map((t) => {
          const locked = !canUseTemplate(t, props.plan);
          return (
            <Fragment key={t.id}>
              <TemplateCard template={t} selected={!locked && t.id === selected?.id} locked={locked}
                previewing={t.id === props.previewing} onPick={() => (locked ? props.onPreview(t.id === props.previewing ? null : t.id) : pick(t))} />
              {peeking && t.id === peeking.id && (
                <div class="ob-unlock" role="status">
                  <span class="ob-unlock-icon" aria-hidden="true"><Icon name="lock" size={22} /></span>
                  <div class="ob-unlock-copy">
                    <strong>{peeking.name} is a Pro template</strong>
                    <p>It's in your preview now with your details. Your page keeps using {selected?.name ?? 'Classic'} until you unlock Pro.</p>
                  </div>
                  <div class="ob-unlock-actions">
                    <a class="btn btn-primary" href={props.proUrl} target="_blank" rel="noopener">Unlock with Pro</a>
                    <button type="button" class="btn" onClick={() => props.onPreview(null)}>Back to {selected?.name ?? 'Classic'}</button>
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
        <FreelanceCard class="ob-freelance" />
      </fieldset>

      {selected && theme && (
        <div class="ob-card ob-customise">
          <div class="ob-card-head">
            <h2 class="ob-card-title">Make it yours</h2>
            <p class="ob-hint">Colour and type change, the {selected.name} layout stays.</p>
          </div>
          <fieldset class="ob-swatches">
            <legend class="lab">Brand colour</legend>
            {[{ name: `${selected.name} default`, hex: selected.defaultTheme.accent }, ...ACCENT_SWATCHES.filter((s) => s.hex !== selected.defaultTheme.accent)].map((s, i) => {
              const on = theme.accent.toUpperCase() === s.hex.toUpperCase();
              return (
                <label class="ob-swatch" title={s.name}>
                  <input type="radio" name="accent" class="ob-sr" checked={on}
                    onChange={() => props.onDesign({ theme: withTheme(design.theme, 'accent', i === 0 ? undefined : s.hex) })} />
                  <span class="ob-swatch-dot" style={{ background: s.hex }}>{on && <Icon name="check" size={16} />}</span>
                  <span class="ob-sr">{s.name}{on ? ' (selected)' : ''}</span>
                </label>
              );
            })}
          </fieldset>
          <fieldset class="ob-fonts">
            <legend class="lab">Headings</legend>
            {SITE_FONT_KEYS.map((f) => {
              const on = theme.font === f;
              return (
                <label class="ob-font" data-font={f}>
                  <input type="radio" name="font" class="ob-sr" checked={on}
                    onChange={() => props.onDesign({ theme: withTheme(design.theme, 'font', f === selected.defaultTheme.font ? undefined : f) })} />
                  <span class="ob-font-aa">Aa</span>
                  <span class="ob-font-name">{SITE_FONTS[f].label}{f === selected.defaultTheme.font && <small> · default</small>}</span>
                </label>
              );
            })}
          </fieldset>
        </div>
      )}
    </Section>
  );
}

/** The owner's overrides with one key set, or removed (back to the template default). */
function withTheme<K extends keyof SiteTheme>(theme: Partial<SiteTheme>, key: K, value: SiteTheme[K] | undefined): Partial<SiteTheme> {
  const next = { ...theme };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

const TEMPLATE_GROUPS_IN = (templates: SiteTemplate[]) =>
  (Object.keys(TEMPLATE_GROUPS) as TemplateGroup[]).filter((g) => templates.some((t) => t.category === g));

/**
 * A gallery card: the real template drawn with a sample business (a
 * representation; the preview on the right shows the owner's own data).
 * Rendered only once it scrolls near the viewport.
 */
function TemplateCard(props: { template: SiteTemplate; selected: boolean; locked: boolean; previewing: boolean; onPick: () => void }) {
  const { template } = props;
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const site = useMemo(() => (visible ? buildSite(sampleBusiness(template), 'live') : null), [visible, template]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const body = (
    <>
      <span class="ob-tpl-thumb" aria-hidden="true">
        {site ? (
          <Scaled width={1280} aspect="4 / 3"><div class="ob-canvas-static" inert><Site site={site} /></div></Scaled>
        ) : <span class="ob-tpl-skeleton" />}
      </span>
      <span class="ob-tpl-text">
        <span class="ob-tpl-name">
          <strong>{template.name}</strong>
          <span class="ob-tpl-group mono">{TEMPLATE_GROUPS[template.category]}</span>
          {template.isPremium && <span class="ob-tpl-pro mono"><Icon name="lock" size={12} /> Pro</span>}
        </span>
        <span id={`tpl-${template.slug}-desc`} class="ob-tpl-desc">{template.description}</span>
      </span>
      {props.locked
        ? <span class="ob-tpl-badge ob-tpl-badge-peek mono" aria-hidden={!props.previewing}><Icon name="lock" size={14} /> Previewing</span>
        : <span class="ob-tpl-badge mono" aria-hidden={!props.selected}><Icon name="check" size={14} /> Selected</span>}
    </>
  );

  // Locked (Pro on a free plan): a button that previews, never a choice that saves.
  if (props.locked) {
    return (
      <button ref={ref as never} type="button" class="ob-tpl" data-locked="" data-previewing={props.previewing || undefined}
        aria-pressed={props.previewing} aria-label={`${template.name}, Pro template, locked. Preview it`} aria-describedby={`tpl-${template.slug}-desc`}
        onClick={props.onPick}>
        {body}
      </button>
    );
  }
  return (
    <label ref={ref as never} class="ob-tpl" data-selected={props.selected || undefined}>
      <input type="radio" name="template" class="ob-sr" checked={props.selected} onChange={props.onPick}
        aria-label={`${template.name}, ${TEMPLATE_GROUPS[template.category]}${template.isPremium ? ', Pro' : ''}`} aria-describedby={`tpl-${template.slug}-desc`} />
      {body}
    </label>
  );
}
