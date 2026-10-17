// Noir: dark and unhurried. The cover photo fills the first screen, a light
// serif carries the name, treatments sit between thin rules.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, HoursList, Icon, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Noir({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const treatments = take(site.services, site.layout.services.limit);

  const section = (key: SiteSection) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'about':
        return (
          <section id="about" class="to-about s-wrap" aria-labelledby="to-about">
            <h2 id="to-about" class="to-label">{site.layout.labels.about ?? 'The house'}</h2>
            {site.tagline ? <p class="s-display">{site.tagline}</p> : <Hint site={site}>A sentence about the experience you offer.</Hint>}
          </section>
        );
      case 'services':
        return (
          <section id="services" class="to-sec s-wrap" aria-labelledby="to-services">
            <h2 id="to-services" class="to-h2 s-display">{site.layout.labels.services ?? 'Treatments'}</h2>
            {treatments.length ? (
              <ul class="to-list">
                {treatments.map((s) => (
                  <li><a href={s.href}>
                    <span class="to-item s-display">{s.name}</span>
                    {s.description && <span class="to-desc">{s.description}</span>}
                    <span class="to-terms">{[s.duration, s.price].filter(Boolean).join('  ·  ')}</span>
                  </a></li>
                ))}
              </ul>
            ) : <NoServices site={site} />}
            <a class="to-reserve" href={site.links.services}>{site.cta}</a>
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="to-gallery" aria-label={site.layout.labels.gallery ?? 'Gallery'}>
            {(photos.length ? photos : [null, null]).map((g, n) => <figure><Photo site={site} img={g} alt={`${site.name}, photo ${n + 1}`} slot="gallery photo" tint={n + 3} /></figure>)}
          </section>
        );
      }
      case 'team':
        return (
          <section id="team" class="to-sec s-wrap" aria-labelledby="to-team">
            <h2 id="to-team" class="to-h2 s-display">{site.layout.labels.team ?? 'Hands'}</h2>
            <ul class="to-team">
              {site.team.map((p, n) => (
                <li><span class="to-portrait"><Photo site={site} img={p.photo} alt="" slot="team photo" tint={n + 3} mono={p.initials} /></span><span class="s-display">{p.name}</span>{p.does && <small>{p.does}</small>}</li>
              ))}
            </ul>
          </section>
        );
      case 'hours':
        return (
          <section id="hours" class="to-sec s-wrap to-narrow" aria-labelledby="to-hours">
            <h2 id="to-hours" class="to-label">Hours</h2>
            <HoursList site={site} class="to-hours" />
          </section>
        );
      case 'contact':
        return (
          <section id="contact" class="to-sec s-wrap to-narrow" aria-labelledby="to-contact">
            <h2 id="to-contact" class="to-label">{site.layout.labels.visit ?? 'Find the house'}</h2>
            <p class="to-place s-display">{placeLine(site)}</p>
            {site.mapsUrl && site.onPremises && <a class="to-link" href={site.mapsUrl} rel="noopener">Directions <Icon name="arrow" size={14} /></a>}
            <ContactList site={site} icons={false} class="to-contact" />
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="to-sec s-wrap to-narrow" aria-labelledby="to-faq">
            <h2 id="to-faq" class="to-label">{site.layout.labels.faq ?? 'Before you come'}</h2>
            <FaqList site={site} class="to-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <section class="to-hero" aria-labelledby="to-name">
        <div class="to-hero-bg"><Photo site={site} img={site.hero} alt="" slot="cover photo" eager tint={5} /></div>
        <header class="to-head s-wrap">
          <nav aria-label="Sections">{nav.slice(0, 3).map((l) => <a href={l.href}>{l.label}</a>)}</nav>
          <a class="to-mark" href="/">{site.logo ? <img src={site.logo.url} alt="" width="40" height="40" /> : site.initials}</a>
          <a class="to-head-cta" href="#services">{site.cta}</a>
        </header>
        <div class="to-hero-in s-wrap">
          <h1 id="to-name" class="to-name s-display"><Name site={site} /></h1>
          <span class="to-rule" aria-hidden="true" />
          {site.area && <p class="to-area">{site.area}</p>}
        </div>
      </section>
      <main>{site.layout.sections.map(section)}</main>
      <footer class="to-foot">
        <p class="s-display"><Name site={site} /></p>
        <p class="to-status">{site.status.text}</p>
        <MadeWith />
      </footer>
    </>
  );
}
