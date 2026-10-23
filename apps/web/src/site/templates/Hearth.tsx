// Hearth: the café on your corner. A centred, friendly welcome over a wide
// rounded photo, today's bakes on soft cards, the people behind the counter.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, HoursList, Icon, Logo, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Hearth({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const counter = take(site.services, site.layout.services.limit);

  const section = (key: SiteSection) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'about':
        return (
          <section id="about" class="the-about s-wrap" aria-label="About">
            {site.tagline ? <p class="s-display">{site.tagline}</p> : <Hint site={site}>A warm sentence about your café.</Hint>}
          </section>
        );
      case 'services':
        return (
          <section id="services" class="the-sec s-wrap" aria-labelledby="the-counter">
            <h2 id="the-counter" class="the-h2 s-display">{site.layout.labels.services ?? 'From the counter'}</h2>
            {counter.length ? (
              <ul class="the-cards">
                {counter.map((s, n) => (
                  <li><a class="the-card" href={s.href}>
                    <span class="the-card-photo"><Photo site={site} img={s.image} alt="" slot="photo" tint={n} mono={s.initials} /></span>
                    <strong class="s-display">{s.name}</strong>
                    {s.description && <span class="the-card-desc">{s.description}</span>}
                    <span class="the-card-foot"><span class="the-pill">{s.price}</span>{s.duration && <span class="the-dur">{s.duration}</span>}</span>
                  </a></li>
                ))}
              </ul>
            ) : <NoServices site={site} />}
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="the-sec s-wrap" aria-label="Photos">
            <div class="the-gallery">
              {(photos.length ? photos : [null, null, null, null]).map((g, n) => <figure><Photo site={site} img={g} alt={`${site.name}, photo ${n + 1}`} slot="gallery photo" tint={n + 2} /></figure>)}
            </div>
          </section>
        );
      }
      case 'hours':
        return (
          <section id="hours" class="the-sec s-wrap" aria-labelledby="the-hours">
            <div class="the-hours-card">
              <span class="the-hours-icon" aria-hidden="true"><Icon name="clock" size={26} /></span>
              <h2 id="the-hours" class="the-h3 s-display">When we're open</h2>
              <HoursList site={site} class="the-hours" />
            </div>
          </section>
        );
      case 'team':
        return (
          <section id="team" class="the-sec s-wrap" aria-labelledby="the-team">
            <h2 id="the-team" class="the-h2 s-display">{site.layout.labels.team ?? 'Behind the counter'}</h2>
            <ul class="the-team">
              {site.team.map((p, n) => (
                <li><span class="the-face"><Photo site={site} img={p.photo} alt="" slot="team photo" tint={n + 1} mono={p.initials} /></span><strong>{p.name}</strong></li>
              ))}
            </ul>
          </section>
        );
      case 'contact':
        return (
          <section id="contact" class="the-sec s-wrap" aria-labelledby="the-visit">
            <div class="the-visit">
              <h2 id="the-visit" class="the-h2 s-display">{site.layout.labels.visit ?? 'Pop in'}</h2>
              <p>{placeLine(site)}</p>
              {site.mapsUrl && site.onPremises && <a class="s-btn s-btn-accent the-btn" href={site.mapsUrl} rel="noopener"><Icon name="pin" size={18} /> Directions</a>}
              <ContactList site={site} />
            </div>
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="the-sec s-wrap" aria-labelledby="the-faq">
            <h2 id="the-faq" class="the-h2 s-display">{site.layout.labels.faq ?? 'Little questions'}</h2>
            <FaqList site={site} class="the-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="the-head s-wrap">
        <a class="the-brand" href="/"><Logo site={site} /><span class="s-display"><Name site={site} /></span></a>
        <nav aria-label="Sections">{nav.map((l) => <a href={l.href}>{l.label}</a>)}</nav>
      </header>
      <main>
        <section class="the-hero s-wrap" aria-labelledby="the-name">
          <p class="the-hello">{site.categoryLabel && site.categoryLabel !== 'Other' ? `Your local ${site.categoryLabel.toLowerCase()}` : 'Come on in'}{site.area ? ` in ${site.area.split(',')[0]}` : ''}</p>
          <h1 id="the-name" class="the-name s-display"><Name site={site} /></h1>
          <div class="the-actions">
            <a class="s-btn s-btn-accent the-btn" href="#services">{site.cta}</a>
            {site.phone && <a class="s-btn s-btn-line the-btn" href={site.phone.href}><Icon name="phone" size={18} /> Call</a>}
          </div>
          <div class="the-hero-photo">
            <Photo site={site} img={site.hero} alt={`Inside ${site.name}`} slot="cover photo" eager tint={1} />
            <span class="the-today" data-open={String(site.status.open)}>{site.status.text}</span>
          </div>
        </section>
        {site.layout.sections.map(section)}
      </main>
      <footer class="the-foot s-wrap">
        <strong class="s-display"><Name site={site} /></strong>
        <a href="#services">{site.cta} <Icon name="arrow" size={14} /></a>
      </footer>
      <MadeWith />
    </>
  );
}
