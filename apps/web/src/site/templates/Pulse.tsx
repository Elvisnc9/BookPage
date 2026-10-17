// Pulse: loud and high-contrast. The name stacked one word per line, sessions
// as bold blocks with the minutes up front, the week as a timetable.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, Icon, Logo, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Pulse({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const sessions = take(site.services, site.layout.services.limit);
  const words = site.name.split(/\s+/).filter(Boolean);

  const section = (key: SiteSection) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'services':
        return (
          <section id="services" class="tp-sec s-wrap" aria-labelledby="tp-sessions">
            <h2 id="tp-sessions" class="tp-h2 s-display">{site.layout.labels.services ?? 'Sessions'}</h2>
            {sessions.length ? (
              <ul class="tp-blocks">
                {sessions.map((s, n) => (
                  <li><a class="tp-block" href={s.href} data-hot={n === 0 || undefined}>
                    <span class="tp-mins s-display">{s.minutes ?? 'Ask'}{s.minutes && <small>min</small>}</span>
                    <strong class="s-display">{s.name}</strong>
                    {s.description && <span class="tp-desc">{s.description}</span>}
                    <span class="tp-foot"><span>{s.price}</span><Icon name="arrow" size={22} /></span>
                  </a></li>
                ))}
              </ul>
            ) : <NoServices site={site} />}
          </section>
        );
      case 'hours':
        return (
          <section id="hours" class="tp-sec s-wrap" aria-labelledby="tp-week">
            <h2 id="tp-week" class="tp-h2 s-display">This week</h2>
            <ol class="tp-week">
              {site.days.map((d) => (
                <li data-today={d.today || undefined} data-closed={d.closed || undefined}>
                  <span class="tp-day s-display">{d.short}</span>
                  <span class="tp-time">{d.closed ? 'Rest day' : d.text.replace(' – ', '\n')}</span>
                </li>
              ))}
            </ol>
          </section>
        );
      case 'team':
        return (
          <section id="team" class="tp-sec s-wrap" aria-labelledby="tp-team">
            <h2 id="tp-team" class="tp-h2 s-display">{site.layout.labels.team ?? 'Coaches'}</h2>
            <ul class="tp-team">
              {site.team.map((p, n) => (
                <li>
                  <span class="tp-coach"><Photo site={site} img={p.photo} alt="" slot="team photo" tint={n} mono={p.initials} /></span>
                  <strong class="s-display">{p.name}</strong>
                  {p.href && <a href={p.href} aria-label={`Book with ${p.name}`}>Train with {p.name.split(' ')[0]} <Icon name="arrow" size={14} /></a>}
                </li>
              ))}
            </ul>
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="tp-gallery" aria-label={site.layout.labels.gallery ?? 'Gallery'}>
            {(photos.length ? photos : [null, null, null, null]).map((g, n) => <figure><Photo site={site} img={g} alt={`${site.name}, photo ${n + 1}`} slot="gallery photo" tint={n} /></figure>)}
          </section>
        );
      }
      case 'about':
        return (
          <section id="about" class="tp-sec s-wrap" aria-label="About">
            {site.tagline ? <p class="tp-about s-display">{site.tagline}</p> : <Hint site={site}>A line about how you train people.</Hint>}
          </section>
        );
      case 'contact':
        return (
          <section id="contact" class="tp-sec s-wrap" aria-labelledby="tp-contact">
            <div class="tp-contact">
              <h2 id="tp-contact" class="tp-h2 s-display">{site.layout.labels.visit ?? 'Find the gym'}</h2>
              <p>{placeLine(site)}</p>
              {site.mapsUrl && site.onPremises && <a class="tp-link" href={site.mapsUrl} rel="noopener">Directions <Icon name="arrow" size={14} /></a>}
              <ContactList site={site} />
            </div>
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="tp-sec s-wrap" aria-labelledby="tp-faq">
            <h2 id="tp-faq" class="tp-h2 s-display">{site.layout.labels.faq ?? 'FAQ'}</h2>
            <FaqList site={site} class="tp-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="tp-head s-wrap">
        <a class="tp-brand s-display" href="/"><Logo site={site} /><span><Name site={site} /></span></a>
        <nav aria-label="Sections">{nav.map((l) => <a href={l.href}>{l.label}</a>)}</nav>
        <a class="s-btn s-btn-accent tp-head-cta" href="#services">{site.cta}</a>
      </header>
      <main>
        <section class="tp-hero s-wrap" aria-labelledby="tp-name">
          <div class="tp-hero-copy">
            <h1 id="tp-name" class="tp-name s-display">
              {site.hasName ? words.map((w) => <span>{w}</span>) : <Name site={site} />}
            </h1>
            {site.tagline ? <p class="tp-tagline">{site.tagline}</p> : <Hint site={site}>Your one-line description appears here.</Hint>}
            <div class="tp-actions">
              <a class="s-btn s-btn-accent" href="#services">{site.cta} <Icon name="arrow" size={18} /></a>
              <span class="tp-live" data-open={String(site.status.open)}>{site.status.text}</span>
            </div>
          </div>
          <div class="tp-hero-photo"><Photo site={site} img={site.hero} alt="" slot="cover photo" eager tint={1} mono={site.initials} /></div>
        </section>
        {site.layout.sections.map(section)}
      </main>
      <footer class="tp-footer s-wrap">
        <strong class="s-display"><Name site={site} /></strong>
        <span>{site.area}</span>
      </footer>
      <MadeWith />
    </>
  );
}
