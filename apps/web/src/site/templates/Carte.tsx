// Carte: a printed menu card. Hours up front like the card in the window,
// dishes with dotted price leaders, a reserve button that never moves far.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, Icon, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Carte({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const dishes = take(site.services, site.layout.services.limit);

  const section = (key: SiteSection) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'hours':
        return (
          <section id="hours" class="tc-card-wrap s-wrap" aria-labelledby="tc-hours">
            <div class="tc-card">
              <h2 id="tc-hours" class="tc-h2 s-display">Opening hours</h2>
              <dl class="tc-hours">
                {site.days.map((d) => (
                  <div data-today={d.today || undefined}>
                    <dt>{d.short}{d.today && <span class="s-sr"> (today)</span>}</dt>
                    <span class="tc-dots" aria-hidden="true" />
                    <dd>{d.closed ? 'Closed' : d.text}</dd>
                  </div>
                ))}
              </dl>
              <p class="tc-note">{site.status.text}</p>
            </div>
          </section>
        );
      case 'services':
        return (
          <section id="services" class="tc-sec s-wrap" aria-labelledby="tc-menu">
            <h2 id="tc-menu" class="tc-h2 tc-center s-display">{site.layout.labels.services ?? 'The menu'}</h2>
            <span class="tc-rule" aria-hidden="true" />
            {dishes.length ? (
              <ul class="tc-menu">
                {dishes.map((s) => (
                  <li><a href={s.href}>
                    <span class="tc-line"><strong class="s-display">{s.name}</strong><span class="tc-dots" aria-hidden="true" /><span class="tc-price">{s.price}</span></span>
                    {(s.description || s.duration) && <span class="tc-desc">{s.description ?? s.duration}</span>}
                  </a></li>
                ))}
              </ul>
            ) : <NoServices site={site} />}
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="tc-photos" aria-label={site.layout.labels.gallery ?? 'Photos'}>
            {(photos.length ? photos : [null, null, null]).map((g, i) => (
              <figure><Photo site={site} img={g} alt={`${site.name}, photo ${i + 1}`} slot="gallery photo" tint={i + 1} /></figure>
            ))}
          </section>
        );
      }
      case 'about':
        return (
          <section id="about" class="tc-sec s-wrap tc-center" aria-label="About">
            {site.tagline ? <p class="tc-about s-display">{site.tagline}</p> : <Hint site={site}>A line about your kitchen.</Hint>}
          </section>
        );
      case 'team':
        return (
          <section id="team" class="tc-sec s-wrap tc-center" aria-labelledby="tc-team">
            <h2 id="tc-team" class="tc-h2 s-display">{site.layout.labels.team ?? 'In the kitchen'}</h2>
            <p class="tc-team">{site.team.map((p) => p.name).join(' · ')}</p>
          </section>
        );
      case 'contact':
        return (
          <section id="contact" class="tc-sec s-wrap tc-find" aria-labelledby="tc-find">
            <h2 id="tc-find" class="tc-h2 s-display">{site.layout.labels.visit ?? 'Find us'}</h2>
            <p class="tc-place">{placeLine(site)}</p>
            {site.mapsUrl && site.onPremises && <a class="tc-link" href={site.mapsUrl} rel="noopener">Directions <Icon name="arrow" size={14} /></a>}
            <ContactList site={site} />
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="tc-sec s-wrap" aria-labelledby="tc-faq">
            <h2 id="tc-faq" class="tc-h2 tc-center s-display">{site.layout.labels.faq ?? 'Good to know'}</h2>
            <FaqList site={site} class="tc-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="tc-head">
        <div class="s-wrap tc-head-in">
          <nav aria-label="Sections">{nav.slice(0, 3).map((l) => <a href={l.href}>{l.label}</a>)}</nav>
          <a class="tc-brand s-display" href="/"><Name site={site} /></a>
          <a class="s-btn s-btn-accent tc-reserve" href="#services">{site.cta}</a>
        </div>
      </header>
      <main>
        <section class="tc-hero" aria-labelledby="tc-name">
          <div class="tc-hero-copy s-wrap">
            {site.categoryLabel && <p class="tc-cat">{site.categoryLabel}{site.area ? ` · ${site.area}` : ''}</p>}
            <h1 id="tc-name" class="tc-name s-display"><Name site={site} /></h1>
            {site.tagline ? <p class="tc-tagline s-display">{site.tagline}</p> : <Hint site={site}>Your one-line description appears here.</Hint>}
            <p class="tc-today">{site.today.closed ? 'Closed today' : `Today ${site.today.text}`}</p>
            <a class="s-btn s-btn-accent" href="#services">{site.cta} <Icon name="arrow" size={16} /></a>
          </div>
          <figure class="tc-hero-photo"><Photo site={site} img={site.hero} alt={`Inside ${site.name}`} slot="cover photo" eager tint={2} /></figure>
        </section>
        {site.layout.sections.map(section)}
      </main>
      <footer class="tc-foot">
        <p class="s-display">{site.name}</p>
        <MadeWith />
      </footer>
    </>
  );
}
