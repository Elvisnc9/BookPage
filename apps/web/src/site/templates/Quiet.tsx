// Quiet: text first. One narrow column, a lot of air, a price list you read
// like a letter. Photos are optional and small.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, HoursList, Icon, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Quiet({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const services = take(site.services, site.layout.services.limit);

  const section = (key: SiteSection) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'about':
        return (
          <section id="about" class="tq-sec" aria-labelledby="tq-about">
            <h2 id="tq-about" class="tq-label">{site.layout.labels.about ?? 'About'}</h2>
            <div class="tq-body">
              {site.tagline ? <p class="tq-lead s-display">{site.tagline}</p> : <Hint site={site}>A few words about how you work and who you help.</Hint>}
              {(site.hero || site.mode === 'preview') && (
                <figure class="tq-figure"><Photo site={site} img={site.hero} alt={`${site.name}`} slot="cover photo" tint={1} /></figure>
              )}
            </div>
          </section>
        );
      case 'services':
        return (
          <section id="services" class="tq-sec" aria-labelledby="tq-services">
            <h2 id="tq-services" class="tq-label">{site.layout.labels.services ?? 'Services'}</h2>
            <div class="tq-body">
              {services.length ? (
                <ul class="tq-list">
                  {services.map((s) => (
                    <li>
                      <a href={s.href}>
                        <span class="tq-item"><strong>{s.name}</strong><span>{s.price}</span></span>
                        <span class="tq-meta">{[s.duration, s.description].filter(Boolean).join(' — ')}</span>
                        <span class="tq-book">{s.bookable ? 'Book this' : 'Ask about this'} <Icon name="arrow" size={14} /></span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : <NoServices site={site} />}
            </div>
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="tq-sec" aria-labelledby="tq-gallery">
            <h2 id="tq-gallery" class="tq-label">{site.layout.labels.gallery ?? 'Space'}</h2>
            <div class="tq-body tq-photos">
              {(photos.length ? photos : [null, null]).map((g, i) => <Photo site={site} img={g} alt={`${site.name}, photo ${i + 1}`} slot="gallery photo" tint={i} />)}
            </div>
          </section>
        );
      }
      case 'team':
        return (
          <section id="team" class="tq-sec" aria-labelledby="tq-team">
            <h2 id="tq-team" class="tq-label">{site.layout.labels.team ?? 'With'}</h2>
            <ul class="tq-body tq-people">
              {site.team.map((p) => <li><strong>{p.name}</strong>{p.does && <span>{p.does}</span>}</li>)}
            </ul>
          </section>
        );
      case 'hours':
        return (
          <section id="hours" class="tq-sec" aria-labelledby="tq-hours">
            <h2 id="tq-hours" class="tq-label">Hours</h2>
            <div class="tq-body">
              <HoursList site={site} class="tq-hours" />
              <p class="tq-note">{site.status.text}. Times in {site.timezoneLabel} time.</p>
            </div>
          </section>
        );
      case 'contact':
        return (
          <section id="contact" class="tq-sec" aria-labelledby="tq-contact">
            <h2 id="tq-contact" class="tq-label">{site.layout.labels.visit ?? 'Contact'}</h2>
            <div class="tq-body">
              <p class="tq-place">{placeLine(site)}{site.mapsUrl && site.onPremises && <> · <a href={site.mapsUrl} rel="noopener">Directions</a></>}</p>
              <ContactList site={site} icons={false} />
            </div>
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="tq-sec" aria-labelledby="tq-faq">
            <h2 id="tq-faq" class="tq-label">{site.layout.labels.faq ?? 'Questions'}</h2>
            <FaqList site={site} class="tq-body" />
          </section>
        );
    }
  };

  return (
    <div class="tq-page">
      <header class="tq-head">
        <a class="tq-brand" href="/"><Name site={site} /></a>
        <nav aria-label="Sections">{nav.map((l) => <a href={l.href}>{l.label}</a>)}</nav>
      </header>
      <main>
        <section class="tq-hero" aria-labelledby="tq-name">
          <h1 id="tq-name" class="tq-name s-display"><Name site={site} /></h1>
          <p class="tq-sub">{[site.categoryLabel, site.area].filter(Boolean).join(' · ') || <Hint as="span" site={site}>Category · where you are</Hint>}</p>
          <div class="tq-cta">
            <a class="s-btn s-btn-accent" href="#services">{site.cta}</a>
            <span class="tq-status" data-open={String(site.status.open)}>{site.status.text}</span>
          </div>
        </section>
        {site.layout.sections.map(section)}
      </main>
      <MadeWith site={site} class="tq-made" />
    </div>
  );
}
