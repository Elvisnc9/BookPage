// Atelier: a quiet boutique. Two big photographs side by side, a tiny confident
// nameplate, then the collection on white with nothing between the eye and the
// work but a name and a price.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, HoursList, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Atelier({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const pieces = take(site.services, site.layout.services.limit);
  // A different photo beside the cover: the first product or gallery shot that isn't the cover itself.
  const second = [...site.services.map((s) => s.image), ...site.gallery].find((x) => x && x.url !== site.hero?.url) ?? null;
  const infoAt = site.layout.sections.findIndex((s) => s === 'contact' || s === 'hours');

  const section = (key: SiteSection, i: number) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'services':
        return (
          <section id="services" class="tat-sec s-wrap" aria-labelledby="tat-collection">
            <div class="tat-sec-head">
              <h2 id="tat-collection" class="tat-label">{site.layout.labels.services ?? 'The collection'}</h2>
              <span class="tat-label">{site.services.length} {site.services.length === 1 ? 'piece' : 'pieces'}</span>
            </div>
            {pieces.length ? (
              <ul class="tat-grid">
                {pieces.map((s, n) => (
                  <li><a class="tat-piece" href={s.href}>
                    <span class="tat-piece-photo"><Photo site={site} img={s.image} alt="" slot="photo" tint={n} mono={s.initials} /></span>
                    <span class="tat-piece-line"><span>{s.name}</span><span>{s.price}</span></span>
                    {s.description && <span class="tat-piece-desc">{s.description}</span>}
                  </a></li>
                ))}
              </ul>
            ) : <NoServices site={site} />}
          </section>
        );
      case 'about':
        return (
          <section id="about" class="tat-about s-wrap" aria-label={site.layout.labels.about ?? 'The studio'}>
            <p class="tat-label">{site.layout.labels.about ?? 'The studio'}</p>
            {site.tagline ? <p class="tat-statement s-display">{site.tagline}</p> : <Hint site={site}>One sentence about what you make.</Hint>}
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="tat-gallery" aria-label="Photos">
            {(photos.length ? photos : [null, null, null, null]).map((g, n) => <figure><Photo site={site} img={g} alt={`${site.name}, photo ${n + 1}`} slot="gallery photo" tint={n + 1} /></figure>)}
          </section>
        );
      }
      case 'team':
        return (
          <section id="team" class="tat-sec s-wrap" aria-labelledby="tat-team">
            <h2 id="tat-team" class="tat-label">{site.layout.labels.team ?? 'Studio'}</h2>
            <p class="tat-names">{site.team.map((p) => p.name).join(' / ')}</p>
          </section>
        );
      case 'contact':
      case 'hours':
        if (i !== infoAt) return null;
        return (
          <section id="contact" class="tat-sec s-wrap tat-info" aria-label="Visit">
            <div><h2 class="tat-label">{site.layout.labels.visit ?? 'Visit'}</h2><p>{placeLine(site)}</p>{site.mapsUrl && site.onPremises && <a href={site.mapsUrl} rel="noopener">Directions</a>}</div>
            <div><h2 class="tat-label">Contact</h2><ContactList site={site} icons={false} /></div>
            {site.layout.sections.includes('hours') && <div><h2 class="tat-label">Hours</h2><HoursList site={site} class="tat-hours" /></div>}
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="tat-sec s-wrap" aria-labelledby="tat-faq">
            <h2 id="tat-faq" class="tat-label">{site.layout.labels.faq ?? 'Questions'}</h2>
            <FaqList site={site} class="tat-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="tat-head s-wrap">
        <nav aria-label="Sections">{nav.slice(0, 3).map((l) => <a href={l.href}>{l.label}</a>)}</nav>
        <a class="tat-mark" href="/"><Name site={site} /></a>
        <a class="tat-cta" href="#services">{site.cta}</a>
      </header>
      <main>
        <section class="tat-hero" aria-labelledby="tat-name">
          <figure><Photo site={site} img={site.hero} alt={site.name} slot="cover photo" eager tint={3} /></figure>
          <figure class="tat-hero-second"><Photo site={site} img={second} alt="" slot="product photo" tint={1} /></figure>
          <div class="tat-hero-caption">
            <h1 id="tat-name" class="tat-name s-display"><Name site={site} /></h1>
            <p>{[site.categoryLabel, site.area].filter(Boolean).join(' — ')}</p>
          </div>
        </section>
        {site.layout.sections.map(section)}
      </main>
      <footer class="tat-foot s-wrap"><span><Name site={site} /></span><span>{site.status.text}</span></footer>
      <MadeWith site={site} />
    </>
  );
}
