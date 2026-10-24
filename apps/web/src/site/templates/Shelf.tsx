// Shelf: a shop window. Every service is a product card with its photo, price
// and a book button; the hero shows the first two like a featured pair.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, HoursList, Icon, Logo, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Shelf({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const products = take(site.services, site.layout.services.limit);
  // The cover photo leads the featured pair when there is one; services fill the rest.
  const featured: ({ kind: 'hero' } | { kind: 'service'; s: SiteModel['services'][number] })[] = [
    ...(site.hero ? [{ kind: 'hero' as const }] : []),
    ...take(site.services, site.hero ? 1 : 2).map((s) => ({ kind: 'service' as const, s })),
  ];
  const infoAt = site.layout.sections.findIndex((s) => s === 'contact' || s === 'hours');

  const section = (key: SiteSection, i: number) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'services':
        return (
          <section id="services" class="ts-sec s-wrap" aria-labelledby="ts-shop">
            <div class="ts-sec-head">
              <h2 id="ts-shop" class="ts-h2 s-display">{site.layout.labels.services ?? 'Shop the menu'}</h2>
              <span class="ts-count">{site.services.length} {site.services.length === 1 ? 'item' : 'items'}</span>
            </div>
            {products.length ? (
              <ul class="ts-grid">
                {products.map((s, n) => (
                  <li class="ts-card">
                    <a href={s.href} class="ts-card-link">
                      <span class="ts-card-photo"><Photo site={site} img={s.image} alt="" slot="photo" tint={n} mono={s.initials} /></span>
                      <span class="ts-card-text">
                        <strong>{s.name}</strong>
                        <span class="ts-card-meta">{s.duration ?? 'By quote'}</span>
                      </span>
                      <span class="ts-card-buy">
                        <span class="ts-price">{s.price}</span>
                        <span class="ts-add" aria-hidden="true">{s.bookable ? 'Book' : 'Ask'} <Icon name="arrow" size={14} /></span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : <NoServices site={site} />}
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="ts-sec s-wrap" aria-labelledby="ts-gallery">
            <h2 id="ts-gallery" class="ts-h2 s-display">{site.layout.labels.gallery ?? 'In the studio'}</h2>
            <div class="ts-strip">
              {(photos.length ? photos : [null, null, null, null]).map((g, n) => <figure><Photo site={site} img={g} alt={`${site.name}, photo ${n + 1}`} slot="gallery photo" tint={n + 2} /></figure>)}
            </div>
          </section>
        );
      }
      case 'about':
        return (
          <section id="about" class="ts-sec s-wrap" aria-label="About">
            {site.tagline ? <p class="ts-about s-display">{site.tagline}</p> : <Hint site={site}>A line about what you make or do.</Hint>}
          </section>
        );
      case 'team':
        return (
          <section id="team" class="ts-sec s-wrap" aria-labelledby="ts-team">
            <h2 id="ts-team" class="ts-h2 s-display">{site.layout.labels.team ?? 'Who you\'ll see'}</h2>
            <ul class="ts-team">
              {site.team.map((p, n) => <li><span class="ts-avatar"><Photo site={site} img={p.photo} alt="" slot="team photo" tint={n} mono={p.initials} /></span><strong>{p.name}</strong></li>)}
            </ul>
          </section>
        );
      case 'contact':
      case 'hours':
        if (i !== infoAt) return null;
        return (
          <section id="contact" class="ts-sec s-wrap" aria-label="Visit and contact">
            <div class="ts-info">
              <div class="ts-panel">
                <h2 class="ts-h3">{site.layout.labels.visit ?? (site.onPremises ? 'Visit the shop' : 'Contact')}</h2>
                <p>{placeLine(site)}</p>
                {site.mapsUrl && site.onPremises && <a class="ts-link" href={site.mapsUrl} rel="noopener">Directions <Icon name="arrow" size={14} /></a>}
                <ContactList site={site} />
              </div>
              {site.layout.sections.includes('hours') && (
                <div class="ts-panel">
                  <h2 class="ts-h3">Opening hours</h2>
                  <HoursList site={site} class="ts-hours" />
                </div>
              )}
            </div>
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="ts-sec s-wrap" aria-labelledby="ts-faq">
            <h2 id="ts-faq" class="ts-h2 s-display">{site.layout.labels.faq ?? 'FAQ'}</h2>
            <FaqList site={site} class="ts-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="ts-head">
        <div class="s-wrap ts-head-in">
          <a class="ts-brand" href="/"><Logo site={site} /><span><Name site={site} /></span></a>
          <nav aria-label="Sections">{nav.map((l) => <a href={l.href}>{l.label}</a>)}</nav>
          <a class="s-btn s-btn-accent ts-head-cta" href="#services">{site.cta}</a>
        </div>
      </header>
      <main>
        <section class="ts-hero s-wrap" aria-labelledby="ts-name">
          <div class="ts-hero-copy">
            <p class="ts-status" data-open={String(site.status.open)}><i aria-hidden="true" />{site.status.text}</p>
            <h1 id="ts-name" class="ts-name s-display"><Name site={site} /></h1>
            {site.tagline ? <p class="ts-tagline">{site.tagline}</p> : <Hint site={site}>Your one-line description appears here.</Hint>}
            <a class="s-btn s-btn-accent" href="#services">{site.cta} <Icon name="arrow" size={16} /></a>
          </div>
          <div class="ts-feature">
            {featured.length ? featured.map((f, n) => f.kind === 'hero' ? (
              <div class="ts-feature-card"><Photo site={site} img={site.hero} alt={`Inside ${site.name}`} slot="cover photo" eager /></div>
            ) : (
              <a class="ts-feature-card" href={f.s.href} aria-label={`${f.s.name}, ${f.s.price}`}>
                <Photo site={site} img={f.s.image} alt="" slot="photo" tint={n + 1} mono={f.s.initials} />
                <span class="ts-feature-tag"><strong>{f.s.name}</strong><span>{f.s.price}</span></span>
              </a>
            )) : [1, 2].map((n) => (
              <div class="ts-feature-card"><Photo site={site} img={null} alt="" slot={n === 1 ? 'cover photo' : 'service photo'} tint={n} /></div>
            ))}
          </div>
        </section>
        {site.layout.sections.map(section)}
      </main>
      <footer class="ts-foot s-wrap">
        <span><Name site={site} /></span>
        <span>{site.area}</span>
      </footer>
      <MadeWith site={site} />
    </>
  );
}
