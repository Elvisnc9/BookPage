// Bistro: a broadsheet menu. The name set like a newspaper nameplate on the left,
// the dining room on the right, then tonight's dishes in two ruled columns with
// the kitchen's story in a boxed sidebar.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, Icon, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Bistro({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const dishes = take(site.services, site.layout.services.limit);
  const open = site.days.filter((d) => !d.closed);

  const section = (key: SiteSection) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'about':
        return null; // drawn beside the menu
      case 'services':
        return (
          <section id="services" class="tbi-menu-wrap s-wrap" aria-labelledby="tbi-menu">
            <div class="tbi-menu-head">
              <h2 id="tbi-menu" class="tbi-h2 s-display">{site.layout.labels.services ?? 'On the menu'}</h2>
              <span class="tbi-rule" aria-hidden="true" />
            </div>
            <div class="tbi-menu-grid">
              {dishes.length ? (
                <ul class="tbi-dishes">
                  {dishes.map((s) => (
                    <li><a href={s.href}>
                      <span class="tbi-dish s-display">{s.name}</span>
                      <span class="tbi-price">{s.price}</span>
                      {s.description && <span class="tbi-desc">{s.description}</span>}
                    </a></li>
                  ))}
                </ul>
              ) : <NoServices site={site} />}
              {site.layout.sections.includes('about') && (shows(site, 'about')) && (
                <aside id="about" class="tbi-side" aria-label={site.layout.labels.about ?? 'The kitchen'}>
                  <p class="tbi-side-label">{site.layout.labels.about ?? 'The kitchen'}</p>
                  {site.tagline ? <p class="tbi-side-text s-display">{site.tagline}</p> : <Hint site={site}>A few lines about your kitchen and what you cook.</Hint>}
                  <a class="tbi-link" href={site.links.services}>{site.cta} <Icon name="arrow" size={14} /></a>
                </aside>
              )}
            </div>
          </section>
        );
      case 'hours':
        return (
          <section id="hours" class="tbi-hours s-wrap" aria-labelledby="tbi-hours-title">
            <h2 id="tbi-hours-title" class="tbi-side-label">Service</h2>
            <ul>
              {site.days.map((d) => (
                <li data-today={d.today || undefined} data-closed={d.closed || undefined}><strong>{d.short}</strong><span>{d.closed ? 'Closed' : d.text}</span></li>
              ))}
            </ul>
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="tbi-photos s-wrap" aria-label="Photos">
            {(photos.length ? photos : [null, null, null]).map((g, n) => (
              <figure><Photo site={site} img={g} alt={`${site.name}, photo ${n + 1}`} slot="gallery photo" tint={n + 1} /><figcaption>{['The room', 'The plate', 'The table'][n % 3]}</figcaption></figure>
            ))}
          </section>
        );
      }
      case 'team':
        return (
          <section id="team" class="tbi-sec s-wrap" aria-labelledby="tbi-team">
            <h2 id="tbi-team" class="tbi-side-label">{site.layout.labels.team ?? 'In the kitchen'}</h2>
            <p class="tbi-team s-display">{site.team.map((p) => p.name).join(', ')}</p>
          </section>
        );
      case 'contact':
        return (
          <section id="contact" class="tbi-sec s-wrap tbi-contact" aria-labelledby="tbi-contact">
            <h2 id="tbi-contact" class="tbi-h2 s-display">{site.layout.labels.visit ?? 'Find us'}</h2>
            <div class="tbi-contact-cols">
              <p class="s-display">{placeLine(site)}{site.mapsUrl && site.onPremises && <><br /><a href={site.mapsUrl} rel="noopener">Directions</a></>}</p>
              <ContactList site={site} icons={false} />
            </div>
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="tbi-sec s-wrap" aria-labelledby="tbi-faq">
            <h2 id="tbi-faq" class="tbi-side-label">{site.layout.labels.faq ?? 'Good to know'}</h2>
            <FaqList site={site} class="tbi-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="tbi-rail s-wrap">
        <span>{[site.categoryLabel, site.area].filter(Boolean).join(' · ') || <Hint as="span" site={site}>Where you are</Hint>}</span>
        <nav aria-label="Sections">{nav.map((l) => <a href={l.href}>{l.label}</a>)}</nav>
        <a class="tbi-book" href={site.links.services}>{site.cta}</a>
      </header>
      <main>
        <section class="tbi-hero s-wrap" aria-labelledby="tbi-name">
          <div class="tbi-plate">
            <h1 id="tbi-name" class="tbi-name s-display" data-length={site.nameLength}><a href="/"><Name site={site} /></a></h1>
            <p class="tbi-tonight">
              <span>{site.today.closed ? 'Closed today' : 'Tonight'}</span>
              {site.today.closed ? site.status.text.replace('Closed · ', '') : site.today.text}
            </p>
            {open.length > 0 && <p class="tbi-week">Open {open.map((d) => d.short).join(' · ')}</p>}
          </div>
          <figure class="tbi-room">
            <Photo site={site} img={site.hero} alt={`Inside ${site.name}`} slot="cover photo" eager tint={2} />
          </figure>
        </section>
        {site.layout.sections.map(section)}
      </main>
      <footer class="tbi-foot s-wrap">
        <span class="s-display"><Name site={site} /></span>
        <a href={site.links.services}>{site.cta} <Icon name="arrow" size={14} /></a>
      </footer>
      <MadeWith />
    </>
  );
}
