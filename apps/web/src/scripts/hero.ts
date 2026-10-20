/**
 * Hero motion (components/marketing/Hero.astro).
 *
 *  1. Entrance: the headline rises line by line, then the scene assembles from
 *     the back (geometry, Today card) to the front (phone, toast, email).
 *  2. A one-off story: a slot is picked on the phone, the button is pressed, the
 *     booking arrives and the email follows.
 *  3. Afterwards, on wide screens with a mouse: pieces drift a few pixels with
 *     the pointer by depth, and float very slowly.
 *
 * Everything is created inside gsap.matchMedia, so it is reverted cleanly if
 * the conditions change or the page is swapped. Callers only load this when
 * reduced motion isn't requested.
 */
import gsap from 'gsap';

export function initHero(): () => void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const stage = hero?.querySelector<HTMLElement>('[data-stage]');
  if (!hero || !stage) return () => {};

  const mm = gsap.matchMedia();
  let introPlayed = false;

  mm.add({ wide: '(min-width: 960px)', pointer: '(hover: hover) and (pointer: fine)' }, (ctx) => {
    const { wide, pointer } = ctx.conditions as { wide: boolean; pointer: boolean };
    const copy = gsap.utils.toArray<HTMLElement>('.hero-copy [data-intro]', hero);
    const pieces = gsap.utils.toArray<HTMLElement>('[data-intro]', stage).sort((a, b) => depth(a) - depth(b));
    const slots = gsap.utils.toArray<HTMLElement>('[data-slot]', stage);
    const cta = stage.querySelector<HTMLElement>('[data-cta]');
    const toast = stage.querySelector<HTMLElement>('[data-toast]');
    const mail = stage.querySelector<HTMLElement>('[data-mail]');
    const picked = slots.find((s) => s.dataset.slot === '10:30');

    // The entrance plays once, on wide screens; phones show the finished scene straight away
    // (it's already visible there), and crossing a breakpoint later only re-wires float and pointer.
    const skip = introPlayed || !wide;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, paused: skip });
    if (!skip) picked?.removeAttribute('data-on'); // the timeline picks 10:30
    tl.fromTo(copy, { opacity: 0, yPercent: 40 }, { opacity: 1, yPercent: 0, duration: 0.8, stagger: 0.08 })
      .fromTo(
        pieces.filter((p) => p !== toast && p !== mail),
        { opacity: 0, y: 50, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.9, stagger: 0.07 },
        0.15,
      )
      .set([toast, mail], { opacity: 0 })
      .add(() => picked?.setAttribute('data-on', ''), '+=0.15')
      .fromTo(picked ?? {}, { scale: 0.92 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' }, '<')
      .to(cta, { scale: 0.95, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.inOut' }, '+=0.25')
      .fromTo(toast, { opacity: 0, x: 40, scale: 0.9 }, { opacity: 1, x: 0, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, '+=0.1')
      .fromTo(mail, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, '+=0.2');

    if (skip) {
      tl.progress(1);
      document.documentElement.classList.remove('hero-motion');
    } else {
      introPlayed = true;
      // The intro has started: drop the pre-hide class (the from-states take over).
      document.documentElement.classList.remove('hero-motion');
    }

    if (wide) {
      // Very slow float on the front pieces only, out of step with each other.
      tl.add(() => {
        gsap.utils.toArray<HTMLElement>('.ha', stage).forEach((el, i) => {
          gsap.to(el, { yPercent: i % 2 ? 3 : -3, duration: 3.2 + i * 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        });
      });
    }

    if (wide && pointer) {
      // Pointer parallax: each piece follows the pointer by its depth (x/y; the float uses yPercent).
      const movers = gsap.utils.toArray<HTMLElement>('[data-depth]', stage).map((el) => ({
        d: depth(el),
        x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3.out' }),
      }));
      const move = (nx: number, ny: number) => movers.forEach((m) => { m.x(nx * m.d * 18); m.y(ny * m.d * 14); });
      const onMove = (e: PointerEvent) => {
        if (tl.isActive()) return; // let the entrance finish first
        const r = hero.getBoundingClientRect();
        move(((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2);
      };
      const onLeave = () => move(0, 0);
      hero.addEventListener('pointermove', onMove);
      hero.addEventListener('pointerleave', onLeave);
      return () => {
        hero.removeEventListener('pointermove', onMove);
        hero.removeEventListener('pointerleave', onLeave);
      };
    }
    return undefined;
  });

  return () => mm.revert();
}

const depth = (el: HTMLElement) => Number(el.dataset.depth ?? 0);
