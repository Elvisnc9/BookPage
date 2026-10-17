// Journal: a magazine spread. A masthead with the name set large in a didone,
// an off-grid photo layout, an index of commissions, a colophon for details.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, HoursList, Icon, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Journal({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const services = take(site.services, site.layout.services.limit);
  const colophonAt = site.layout.sections.findIndex((s) => s === 'contact' || s === 'hours');

  const section = (key: SiteSection, i: number) => {
    // The spread carries the cover photo too, so it stays when there's a photo but no line yet.
    const visible = key === 'about' ? shows(site, key) || (site.layout.sections.includes('about') && !!site.hero) : shows(site, key);
    if (!visible) return null;
    switch (key) {
      case 'about':
        return (
          <section id="about" class="tj-spread s-wrap" aria-label={site.layout.labels.about ?? 'About'}>
            <figure class="tj-lead-photo"><Photo site={site} img={site.hero} alt={site.name} slot="cover photo" eager tint={3} /></figure>
            <div class="tj-standfirst">
              {site.tagline ? <p class="s-display">“{site.tagline}”</p> : <Hint site={site}>Your one-line description, set as a pull quote.</Hint>}
              <a class="tj-link" href="#services">{site.cta} <Icon name="arrow" size={16} /></a>
            </div>
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="tj-sec s-wrap" aria-labelledby="tj-gallery">
            <h2 id="tj-gallery" class="tj-h2 s-display">{site.layout.labels.gallery ?? 'Selected work'}</h2>
            <div class="tj-mosaic">
              {(photos.length ? photos : [null, null, null, null, null]).map((g, n) => (
                <figure><Photo site={site} img={g} alt={`${site.name}, work ${n + 1}`} slot="gallery photo" tint={n} /></figure>
              ))}
            </div>
          </section>
        );
      }
      case 'services':
        return (
          <section id="services" class="tj-sec s-wrap" aria-labelledby="tj-services">
            <h2 id="tj-services" class="tj-h2 s-display">{site.layout.labels.services ?? 'Commissions'}</h2>
            {services.length ? (
              <ol class="tj-index">
                {services.map((s) => (
                  <li><a href={s.href}>
                    <span class="tj-entry s-display">{s.name}</span>
                    {s.description && <span class="tj-desc">{s.description}</span>}
                    <span class="tj-terms">{[s.duration, s.price].filter(Boolean).join(' · ')}</span>
                  </a></li>
                ))}
              </ol>
            ) : <NoServices site={site} />}
          </section>
        );
      case 'team':
        return (
          <section id="team" class="tj-sec s-wrap" aria-labelledby="tj-team">
            <h2 id="tj-team" class="tj-h2 s-display">{site.layout.labels.team ?? 'Contributors'}</h2>
            <ul class="tj-bylines">
              {site.team.map((p, n) => (
                <li>
                  <span class="tj-portrait"><Photo site={site} img={p.photo} alt={p.name} slot="team photo" tint={n + 2} mono={p.initials} /></span>
                  <strong class="s-display">{p.name}</strong>
                  {p.does && <small>{p.does}</small>}
                </li>
              ))}
            </ul>
          </section>
        );
      case 'contact':
      case 'hours':
        if (i !== colophonAt) return null;
        return (
          <section id="contact" class="tj-colophon s-wrap" aria-labelledby="tj-colophon">
            <h2 id="tj-colophon" class="tj-h2 s-display">{site.layout.labels.visit ?? 'Colophon'}</h2>
            <div class="tj-cols">
              <div><h3>Where</h3><p>{placeLine(site)}</p>{site.mapsUrl && site.onPremises && <a href={site.mapsUrl} rel="noopener">Directions</a>}</div>
              <div><h3>Write or call</h3><ContactList site={site} icons={false} /></div>
              {site.layout.sections.includes('hours') && <div><h3>Studio hours</h3><HoursList site={site} class="tj-hours" /></div>}
            </div>
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="tj-sec s-wrap" aria-labelledby="tj-faq">
            <h2 id="tj-faq" class="tj-h2 s-display">{site.layout.labels.faq ?? 'Notes'}</h2>
            <FaqList site={site} class="tj-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="tj-mast s-wrap">
        <div class="tj-rail">
          <span>{site.categoryLabel ?? 'Studio'}</span>
          <nav aria-label="Sections">{nav.map((l) => <a href={l.href}>{l.label}</a>)}</nav>
          <span>{site.status.open ? 'Open today' : 'Bookings open'}</span>
        </div>
        <h1 class="tj-name s-display"><a href="/"><Name site={site} /></a></h1>
        <p class="tj-dateline">{site.area ?? <Hint as="span" site={site}>Where you are</Hint>}</p>
      </header>
      <main>{site.layout.sections.map(section)}</main>
      <footer class="tj-foot s-wrap">
        <span class="s-display"><Name site={site} /></span>
        <a class="tj-link" href="#services">{site.cta} <Icon name="arrow" size={16} /></a>
      </footer>
      <MadeWith />
    </>
  );
}
