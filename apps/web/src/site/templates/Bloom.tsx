// Bloom: a soft lifestyle store. A photo collage arranged around the name,
// a short story, then rounded product cards on pastel tiles.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, HoursList, Icon, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Bloom({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const products = take(site.services, site.layout.services.limit);
  // Three different photos when there are three: cover first, then gallery and product shots, no repeats.
  const pool = [site.hero, ...site.gallery, ...site.services.map((s) => s.image)].filter((x) => !!x);
  const unique = pool.filter((x, i) => pool.findIndex((y) => y!.url === x!.url) === i);
  const collage = [0, 1, 2].map((n) => (n === 0 ? site.hero : unique.filter((x) => x !== site.hero)[n - 1] ?? null));
  const infoAt = site.layout.sections.findIndex((s) => s === 'contact' || s === 'hours');

  const section = (key: SiteSection, i: number) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'about':
        return (
          <section id="about" class="tbl-story s-wrap" aria-labelledby="tbl-story">
            <h2 id="tbl-story" class="tbl-h2 s-display">{site.layout.labels.about ?? 'Our story'}</h2>
            {site.tagline ? <p>{site.tagline}</p> : <Hint site={site}>A few words about what you make and why.</Hint>}
          </section>
        );
      case 'services':
        return (
          <section id="services" class="tbl-sec s-wrap" aria-labelledby="tbl-shop">
            <h2 id="tbl-shop" class="tbl-h2 s-display">{site.layout.labels.services ?? 'Shop and book'}</h2>
            {products.length ? (
              <ul class="tbl-cards">
                {products.map((s, n) => (
                  <li><a class="tbl-card" href={s.href} data-tone={n % 3}>
                    <span class="tbl-card-photo"><Photo site={site} img={s.image} alt="" slot="photo" tint={n} mono={s.initials} /></span>
                    <span class="tbl-card-text">
                      <strong class="s-display">{s.name}</strong>
                      {s.description && <span>{s.description}</span>}
                    </span>
                    <span class="tbl-card-foot"><span class="tbl-chip">{s.price}</span><span class="tbl-go" aria-hidden="true"><Icon name="arrow" size={16} /></span></span>
                  </a></li>
                ))}
              </ul>
            ) : <NoServices site={site} />}
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="tbl-sec s-wrap" aria-label="Photos">
            <div class="tbl-gallery">
              {(photos.length ? photos : [null, null, null, null, null]).map((g, n) => <figure><Photo site={site} img={g} alt={`${site.name}, photo ${n + 1}`} slot="gallery photo" tint={n + 1} /></figure>)}
            </div>
          </section>
        );
      }
      case 'team':
        return (
          <section id="team" class="tbl-sec s-wrap" aria-labelledby="tbl-team">
            <h2 id="tbl-team" class="tbl-h2 s-display">{site.layout.labels.team ?? 'The makers'}</h2>
            <ul class="tbl-team">
              {site.team.map((p, n) => <li><span class="tbl-face"><Photo site={site} img={p.photo} alt="" slot="team photo" tint={n} mono={p.initials} /></span><span class="s-display">{p.name}</span></li>)}
            </ul>
          </section>
        );
      case 'contact':
      case 'hours':
        if (i !== infoAt) return null;
        return (
          <section id="contact" class="tbl-sec s-wrap" aria-label="Visit">
            <div class="tbl-visit">
              <div>
                <h2 class="tbl-h3 s-display">{site.layout.labels.visit ?? 'Come and see us'}</h2>
                <p>{placeLine(site)}</p>
                {site.mapsUrl && site.onPremises && <a class="tbl-link" href={site.mapsUrl} rel="noopener">Directions <Icon name="arrow" size={14} /></a>}
                <ContactList site={site} />
              </div>
              {site.layout.sections.includes('hours') && <div><h2 class="tbl-h3 s-display">Opening hours</h2><HoursList site={site} class="tbl-hours" /></div>}
            </div>
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="tbl-sec s-wrap" aria-labelledby="tbl-faq">
            <h2 id="tbl-faq" class="tbl-h2 s-display">{site.layout.labels.faq ?? 'Good to know'}</h2>
            <FaqList site={site} class="tbl-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="tbl-head s-wrap">
        <a class="tbl-brand s-display" href="/"><Name site={site} /></a>
        <nav aria-label="Sections">{nav.map((l) => <a href={l.href}>{l.label}</a>)}</nav>
        <a class="tbl-head-cta" href="#services">{site.cta}</a>
      </header>
      <main>
        <section class="tbl-hero s-wrap" aria-labelledby="tbl-name">
          <div class="tbl-collage" aria-hidden={site.hero ? undefined : 'true'}>
            {collage.map((img, n) => (
              <figure data-n={n}><Photo site={site} img={img} alt={n === 0 ? site.name : ''} slot={n === 0 ? 'cover photo' : 'gallery photo'} eager={n === 0} tint={n + 1} /></figure>
            ))}
          </div>
          <div class="tbl-hero-copy">
            <h1 id="tbl-name" class="tbl-name s-display"><Name site={site} /></h1>
            {site.area && <p class="tbl-area">{site.area}</p>}
            <a class="s-btn s-btn-accent tbl-btn" href="#services">{site.cta}</a>
          </div>
        </section>
        {site.layout.sections.map(section)}
      </main>
      <footer class="tbl-foot s-wrap"><span class="s-display"><Name site={site} /></span><span>{site.status.text}</span></footer>
      <MadeWith site={site} />
    </>
  );
}
