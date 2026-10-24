// Billboard: the name as a poster. Huge condensed type centred over a
// full-bleed photo, a band of services, rows you can read from across a room.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, HoursList, Icon, Logo, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Billboard({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const services = take(site.services, site.layout.services.limit);
  const contactAt = site.layout.sections.findIndex((s) => s === 'contact' || s === 'hours');

  const section = (key: SiteSection, i: number) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'services':
        return (
          <section id="services" class="tb-sec s-wrap" aria-labelledby="tb-services">
            <h2 id="tb-services" class="tb-h2 s-display">{site.layout.labels.services ?? 'Services'}</h2>
            {services.length ? (
              <ul class="tb-rows">
                {services.map((s) => (
                  <li><a class="tb-row" href={s.href}>
                    <span class="tb-row-name s-display">{s.name}</span>
                    <span class="tb-row-meta">{s.duration ?? 'Quote'}{s.description ? ` · ${s.description}` : ''}</span>
                    <span class="tb-row-price">{s.price}</span>
                    <span class="tb-row-go" aria-hidden="true"><Icon name="arrow" size={22} /></span>
                  </a></li>
                ))}
              </ul>
            ) : <NoServices site={site} />}
          </section>
        );
      case 'about':
        return (
          <section id="about" class="tb-sec s-wrap tb-about" aria-label="About">
            {site.tagline ? <p class="s-display">{site.tagline}</p> : <Hint site={site}>A line about what you do.</Hint>}
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="tb-gallery" aria-label={site.layout.labels.gallery ?? 'Gallery'}>
            {(photos.length ? photos : [null, null, null, null]).map((g, i) => (
              <div class="tb-tile"><Photo site={site} img={g} alt={`${site.name}, photo ${i + 1}`} slot="gallery photo" tint={i + 1} /></div>
            ))}
          </section>
        );
      }
      case 'team':
        return (
          <section id="team" class="tb-sec s-wrap" aria-labelledby="tb-team">
            <h2 id="tb-team" class="tb-h2 s-display">{site.layout.labels.team ?? `The ${site.crew}`}</h2>
            <ul class="tb-team">
              {site.team.map((p, i) => (
                <li>
                  <div class="tb-team-photo"><Photo site={site} img={p.photo} alt={p.name} slot="team photo" tint={i} mono={p.initials} /></div>
                  <strong class="s-display">{p.name}</strong>
                  {p.does && <small>{p.does}</small>}
                </li>
              ))}
            </ul>
          </section>
        );
      case 'contact':
      case 'hours':
        if (i !== contactAt) return null;
        return (
          <section id="contact" class="tb-dark" aria-labelledby="tb-contact">
            <div class="s-wrap tb-split">
              <div>
                <h2 id="tb-contact" class="tb-h2 s-display">{site.layout.labels.visit ?? 'Get in touch'}</h2>
                <p class="tb-place">{placeLine(site)}</p>
                {site.mapsUrl && site.onPremises && <a class="s-btn s-btn-line" href={site.mapsUrl} rel="noopener">Directions <Icon name="arrow" size={16} /></a>}
                <ContactList site={site} />
              </div>
              {site.layout.sections.includes('hours') && (
                <div>
                  <h3 class="tb-h3 s-display">Hours</h3>
                  <HoursList site={site} class="tb-hours" />
                </div>
              )}
            </div>
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="tb-sec s-wrap" aria-labelledby="tb-faq">
            <h2 id="tb-faq" class="tb-h2 s-display">{site.layout.labels.faq ?? 'Questions'}</h2>
            <FaqList site={site} class="tb-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="tb-head">
        <div class="s-wrap tb-head-in">
          <a class="tb-brand" href="/"><Logo site={site} /><span class="s-display"><Name site={site} /></span></a>
          <nav class="tb-nav" aria-label="Sections">{nav.map((l) => <a href={l.href}>{l.label}</a>)}</nav>
          {site.phone && <a class="tb-call" href={site.phone.href}><Icon name="phone" size={18} /><span>{site.phone.label}</span></a>}
        </div>
      </header>

      <main>
        <section class="tb-hero" aria-labelledby="tb-name">
          <div class="tb-hero-bg">
            <Photo site={site} img={site.hero} alt="" slot="cover photo" eager tint={3} />
          </div>
          <div class="s-wrap tb-hero-in">
            {site.area && <p class="tb-area">{site.area}</p>}
            <h1 id="tb-name" class="tb-name s-display" data-length={site.nameLength}><Name site={site} /></h1>
            {site.tagline ? <p class="tb-tagline">{site.tagline}</p> : <Hint site={site}>Your one-line description appears here.</Hint>}
            <div class="tb-actions">
              <a class="s-btn s-btn-accent" href="#services">{site.cta} <Icon name="arrow" size={18} /></a>
              {site.phone && <a class="s-btn s-btn-line" href={site.phone.href}><Icon name="phone" size={18} /> Call</a>}
            </div>
            <p class="tb-status" data-open={String(site.status.open)}><i aria-hidden="true" />{site.status.text}</p>
          </div>
        </section>

        {services.length > 0 && (
          <div class="tb-band" aria-hidden="true">
            <p class="s-display">{services.map((s) => <span>{s.name}</span>)}</p>
          </div>
        )}

        {site.layout.sections.map(section)}
      </main>

      <footer class="tb-foot">
        <div class="s-wrap tb-foot-in">
          <strong class="s-display"><Name site={site} /></strong>
          <a class="s-btn s-btn-accent" href="#services">{site.cta}</a>
        </div>
        <MadeWith site={site} />
      </footer>
    </>
  );
}
