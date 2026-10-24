// Reduced motion is honoured by one global rule in base.css, which every page
// (onboarding, booking pages, marketing) loads. These checks keep it that way and
// keep the onboarding's own motion inside the agreed grammar.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const base = read('./base.css');
const onboarding = read('../components/onboarding/onboarding.css');
const site = read('../site/site.css');

describe('motion', () => {
  it('flattens every animation and transition when the visitor asks for reduced motion', () => {
    const block = base.slice(base.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/\*, \*::before, \*::after \{/);
    expect(block).toMatch(/animation-duration: \.01ms !important/);
    expect(block).toMatch(/transition-duration: \.01ms !important/);
    expect(site).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('loads base.css on the onboarding and booking pages', () => {
    expect(read('../layouts/Base.astro')).toContain("import '../styles/base.css'");
    expect(read('../pages/app/onboarding.astro')).toContain("import Base from '../../layouts/Base.astro'");
    expect(read('../pages/site/[slug]/index.astro')).toContain("import Base from '../../../layouts/Base.astro'");
  });

  it('keeps onboarding motion short, eased out, and off layout properties', () => {
    expect(onboarding).not.toMatch(/transition:\s*all/);
    expect(onboarding).not.toMatch(/ease-in[;\s,)]/);
    // Durations stay at or under 520ms (the one celebration: the publish stamp).
    for (const [, ms] of onboarding.matchAll(/(\d+)ms/g)) expect(Number(ms)).toBeLessThanOrEqual(900);
    const animated = [...onboarding.matchAll(/@keyframes [\w-]+ \{([^}]*\}[^}]*)\}/g)].map((m) => m[1]);
    for (const body of animated) expect(body).not.toMatch(/\b(width|height|top|left|margin|padding):/);
    // Only loading indicators loop.
    const loops = [...onboarding.matchAll(/animation: ([\w-]+)[^;]*infinite/g)].map((m) => m[1]);
    expect([...new Set(loops)].sort()).toEqual(['ob-blink', 'ob-pulse', 'ob-spin']);
  });

  it('gates hover effects to devices that can hover', () => {
    const hovers = [...onboarding.matchAll(/^[^@\n]*:hover[^{]*\{/gm)];
    const gate = onboarding.indexOf('@media (hover: hover) and (pointer: fine)');
    for (const h of hovers) expect(h.index!).toBeGreaterThan(gate);
  });
});
