// Stockroom: a product wall, floor to ceiling. A loud "in stock" header with true
// counts, then dense square tiles with price stickers, edge to edge.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, HoursList, Icon, Logo, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Stockroom({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const items = take(site.services, site.layout.services.limit);
  const infoAt = site.layout.sections.findIndex((s) => s === 'contact' || s === 'hours');

  const section = (key: SiteSection, i: number) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'services':
        return (
          <section id="services" class="tst-wall-wrap" aria-labelledby="tst-stock">
            <div class="s-wrap tst-wall-head">
              <h2 id="tst-stock" class="tst-h2 s-display">{site.layout.labels.services ?? 'In stock now'}</h2>
              <span class="tst-count mono">{String(site.services.length).padStart(2, '0')} items</span>
            </div>
            {items.length ? (
              <ul class="tst-wall">
                {items.map((s, n) => (
                  <li><a class="tst-tile" href={s.href}>
                    <span class="tst-tile-photo"><Photo site={site} img={s.image} alt="" slot="photo" tint={n} mono={s.initials} /></span>
                    <span class="tst-price s-display">{s.price}</span>
                    <span class="tst-tile-name s-display">{s.name}</span>
                    <span class="tst-tile-meta">{s.bookable ? `Book · ${s.duration ?? ''}` : 'Ask about it'}</span>
                  </a></li>
                ))}
              </ul>
            ) : <div class="s-wrap"><NoServices site={site} /></div>}
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="tst-gallery" aria-label="Photos">
            {(photos.length ? photos : [null, null, null, null, null, null]).map((g, n) => <figure><Photo site={site} img={g} alt={`${site.name}, photo ${n + 1}`} slot="gallery photo" tint={n} /></figure>)}
          </section>
        );
      }
      case 'contact':
      case 'hours':
        if (i !== infoAt) return null;
        return (
          <section id="contact" class="tst-info s-wrap" aria-label="Visit and contact">
            <div class="tst-panel">
              <h2 class="tst-h3 s-display">{site.layout.labels.visit ?? 'The shop'}</h2>
              <p>{placeLine(site)}</p>
              {site.mapsUrl && site.onPremises && <a class="tst-link" href={site.mapsUrl} rel="noopener">Directions <Icon name="arrow" size={14} /></a>}
              <ContactList site={site} />
            </div>
            {site.layout.sections.includes('hours') && (
              <div class="tst-panel">
                <h2 class="tst-h3 s-display">Hours</h2>
                <HoursList site={site} class="tst-hours" />
              </div>
            )}
          </section>
        );
      case 'about':
        return (
          <section id="about" class="tst-sec s-wrap" aria-label="About">
            {site.tagline ? <p class="tst-about s-display">{site.tagline}</p> : <Hint site={site}>A line about the shop.</Hint>}
          </section>
        );
      case 'team':
        return (
          <section id="team" class="tst-sec s-wrap" aria-labelledby="tst-team">
            <h2 id="tst-team" class="tst-h3 s-display">{site.layout.labels.team ?? 'Behind the till'}</h2>
            <p>{site.team.map((p) => p.name).join(' · ')}</p>
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="tst-sec s-wrap" aria-labelledby="tst-faq">
            <h2 id="tst-faq" class="tst-h3 s-display">{site.layout.labels.faq ?? 'FAQ'}</h2>
            <FaqList site={site} class="tst-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="tst-head">
        <div class="s-wrap tst-head-in">
          <a class="tst-brand s-display" href="/"><Logo site={site} /><span><Name site={site} /></span></a>
          <nav aria-label="Sections">{nav.map((l) => <a href={l.href}>{l.label}</a>)}</nav>
          <a class="tst-head-cta s-display" href="#services">{site.cta}</a>
        </div>
      </header>
      <main>
        <section class="tst-hero s-wrap" aria-labelledby="tst-name">
          <h1 id="tst-name" class="tst-name s-display" data-length={site.nameLength}><Name site={site} /></h1>
          <dl class="tst-facts">
            <div><dt>Items</dt><dd class="s-display">{site.services.length}</dd></div>
            {site.lowestPrice && <div><dt>From</dt><dd class="s-display">{site.lowestPrice}</dd></div>}
            <div><dt>Today</dt><dd class="s-display">{site.status.open ? 'Open' : 'Closed'}</dd></div>
          </dl>
          {site.tagline ? <p class="tst-tagline">{site.tagline}</p> : <Hint site={site}>Your one-line description appears here.</Hint>}
        </section>
        {site.layout.sections.map(section)}
      </main>
      <footer class="tst-foot">
        <div class="s-wrap"><strong class="s-display"><Name site={site} /></strong><span>{site.status.text}</span></div>
        <MadeWith site={site} />
      </footer>
    </>
  );
}
