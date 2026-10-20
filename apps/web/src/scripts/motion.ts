/**
 * Marketing-site motion: Lenis smooth scroll, GSAP ScrollTrigger reveals,
 * data-speed parallax on the floating stickers, and the workflow string
 * drawing itself in. CSS and SMIL handle the always-on loops (drift, swing,
 * marquee).
 *
 * Loaded only when the visitor hasn't asked for reduced motion. Nothing is
 * hidden by CSS, so the page reads fine without this script.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initHero } from './hero';

gsap.registerPlugin(ScrollTrigger);

// The hero's entrance, story and pointer parallax (reverted if the page is swapped out).
const disposeHero = initHero();
document.addEventListener('astro:before-swap', () => {
  disposeHero();
  lenis.destroy();
  ScrollTrigger.getAll().forEach((t) => t.kill());
}, { once: true });

// Smooth wheel scrolling on desktop; touch keeps native scrolling (better on phones).
const lenis = new Lenis({ anchors: { offset: -72 }, autoRaf: false });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// Sections and cards rise in as they enter.
for (const el of gsap.utils.toArray<HTMLElement>('[data-reveal]')) {
  gsap.from(el, {
    y: 36,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%', once: true },
  });
}

// Parallax: data-speed < 1 lags behind the scroll, > 1 runs ahead. Smaller
// screens get a shorter throw so the stacked hero cards don't collide.
const throwDistance = () => Math.min(240, window.innerWidth * 0.2);
for (const el of gsap.utils.toArray<HTMLElement>('[data-speed]')) {
  const speed = Number(el.dataset.speed) || 1;
  gsap.to(el, {
    y: () => (1 - speed) * throwDistance(),
    ease: 'none',
    scrollTrigger: { trigger: el.closest('section') ?? el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });
}

// The workflow string draws itself in as "How it works" scrolls into view.
for (const line of gsap.utils.toArray<SVGPathElement>('.mk-strline')) {
  gsap.fromTo(line, { strokeDashoffset: 1 }, {
    strokeDashoffset: 0,
    ease: 'none',
    scrollTrigger: { trigger: line.closest('section'), start: 'top 75%', end: 'center 55%', scrub: true },
  });
}
