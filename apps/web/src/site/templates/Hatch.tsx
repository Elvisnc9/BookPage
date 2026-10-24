// Hatch: a street-food stall. The name as a hand-painted sign, the menu as a
// board of black tiles with price stickers, the hours on a band, the phone
// number big enough to read from the queue.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { FaqList, Hint, Icon, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Hatch({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const menu = take(site.services, site.layout.services.limit);

  const section = (key: SiteSection) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'services':
        return (
          <section id="services" class="tha-board" aria-labelledby="tha-menu">
            <div class="s-wrap">
              <h2 id="tha-menu" class="tha-h2 s-display">{site.layout.labels.services ?? 'Order up'}</h2>
              {menu.length ? (
                <ul class="tha-tiles">
                  {menu.map((s, n) => (
                    <li><a class="tha-tile" href={s.href} data-tilt={n % 3}>
                      {s.image && <span class="tha-tile-photo"><Photo site={site} img={s.image} alt="" slot="photo" /></span>}
                      <strong class="s-display">{s.name}</strong>
                      {s.description && <span class="tha-tile-desc">{s.description}</span>}
                      <span class="tha-sticker s-display">{s.price}</span>
                      <span class="tha-go">{s.bookable ? 'Book' : 'Ask'} <Icon name="arrow" size={16} /></span>
                    </a></li>
                  ))}
                </ul>
              ) : <NoServices site={site} />}
            </div>
          </section>
        );
      case 'hours':
        return (
          <section id="hours" class="tha-band" aria-labelledby="tha-hours">
            <h2 id="tha-hours" class="s-sr">Opening hours</h2>
            <ul class="s-wrap">
              {site.days.map((d) => (
                <li data-today={d.today || undefined} data-closed={d.closed || undefined}>
                  <strong class="s-display">{d.short}</strong><span>{d.closed ? 'Closed' : d.text.replace(/:00/g, '').replace(/ (AM|PM)/g, (m) => m.trim().toLowerCase())}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="tha-snaps s-wrap" aria-label="Photos">
            {(photos.length ? photos : [null, null, null, null]).map((g, n) => (
              <figure data-tilt={n % 3}><Photo site={site} img={g} alt={`${site.name}, photo ${n + 1}`} slot="gallery photo" tint={n} /></figure>
            ))}
          </section>
        );
      }
      case 'contact':
        return (
          <section id="contact" class="tha-sec s-wrap" aria-labelledby="tha-find">
            <h2 id="tha-find" class="tha-h2 s-display">{site.layout.labels.visit ?? 'Find the hatch'}</h2>
            <p class="tha-place">{placeLine(site)}</p>
            <div class="tha-calls">
              {site.phone && <a class="tha-call s-display" href={site.phone.href}><Icon name="phone" size={22} />{site.phone.label}</a>}
              {site.whatsapp && <a class="tha-call tha-call-alt s-display" href={site.whatsapp}><Icon name="chat" size={22} />WhatsApp</a>}
              {site.mapsUrl && site.onPremises && <a class="tha-call tha-call-alt s-display" href={site.mapsUrl} rel="noopener"><Icon name="pin" size={22} />Directions</a>}
            </div>
          </section>
        );
      case 'about':
        return (
          <section id="about" class="tha-sec s-wrap" aria-label="About">
            {site.tagline ? <p class="tha-about s-display">{site.tagline}</p> : <Hint site={site}>One line about your food.</Hint>}
          </section>
        );
      case 'team':
        return (
          <section id="team" class="tha-sec s-wrap" aria-labelledby="tha-team">
            <h2 id="tha-team" class="tha-h2 s-display">{site.layout.labels.team ?? 'The crew'}</h2>
            <p class="tha-crew">{site.team.map((p) => p.name).join(' + ')}</p>
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="tha-sec s-wrap" aria-labelledby="tha-faq">
            <h2 id="tha-faq" class="tha-h2 s-display">{site.layout.labels.faq ?? 'Questions'}</h2>
            <FaqList site={site} class="tha-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="tha-head">
        <div class="s-wrap tha-head-in">
          <a class="tha-brand s-display" href="/"><Name site={site} /></a>
          <nav aria-label="Sections">{nav.map((l) => <a href={l.href}>{l.label}</a>)}</nav>
          <span class="tha-open s-display" data-open={String(site.status.open)}>{site.status.open ? 'Open now' : 'Closed'}</span>
        </div>
      </header>
      <main>
        <section class="tha-hero" aria-labelledby="tha-name">
          <div class="s-wrap tha-hero-in">
            <h1 id="tha-name" class="tha-name s-display" data-length={site.nameLength}><Name site={site} /></h1>
            {site.tagline ? <p class="tha-bubble">{site.tagline}</p> : <Hint site={site}>Your one-line description appears here.</Hint>}
            <div class="tha-actions">
              <a class="tha-order s-display" href="#services">{site.cta} <Icon name="arrow" size={22} /></a>
              <span class="tha-when">{site.status.text}</span>
            </div>
          </div>
          {(site.hero || site.mode === 'preview') && (
            <div class="tha-hero-photo"><Photo site={site} img={site.hero} alt="" slot="cover photo" eager tint={3} /></div>
          )}
        </section>
        {site.layout.sections.map(section)}
      </main>
      <footer class="tha-foot">
        <div class="s-wrap"><strong class="s-display"><Name site={site} /></strong><span>{site.area}</span></div>
        <MadeWith site={site} />
      </footer>
    </>
  );
}
