// Folio: the work leads. A gallery wall first, one line about you, then a
// short, typewriter-plain list of what can be booked.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, HoursList, Icon, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Folio({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const services = take(site.services, site.layout.services.limit);
  const infoAt = site.layout.sections.findIndex((s) => s === 'contact' || s === 'hours');

  const section = (key: SiteSection, i: number) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        const wall = photos.length ? photos : site.mode === 'preview' ? [null, null, null, null, null, null] : [];
        return (
          <section id="gallery" class="tf-wall" aria-label={site.layout.labels.gallery ?? 'Work'}>
            {site.hero && <figure class="tf-piece tf-piece-wide"><Photo site={site} img={site.hero} alt={`${site.name}, featured work`} slot="cover photo" eager /></figure>}
            {wall.map((g, n) => (
              <figure class="tf-piece" data-shape={n % 3}><Photo site={site} img={g} alt={`${site.name}, work ${n + 1}`} slot="gallery photo" tint={n} /></figure>
            ))}
          </section>
        );
      }
      case 'about':
        return (
          <section id="about" class="tf-sec s-wrap" aria-label="About">
            {site.tagline ? <p class="tf-about s-display">{site.tagline}</p> : <Hint site={site}>One line about your work.</Hint>}
          </section>
        );
      case 'services':
        return (
          <section id="services" class="tf-sec s-wrap" aria-labelledby="tf-services">
            <h2 id="tf-services" class="tf-label">{site.layout.labels.services ?? 'Book a slot'}</h2>
            {services.length ? (
              <table class="tf-table">
                <tbody>
                  {services.map((s) => (
                    <tr>
                      <th scope="row"><a href={s.href}>{s.name}</a></th>
                      <td>{s.duration ?? 'by quote'}</td>
                      <td>{s.price}</td>
                      <td><a href={s.href} aria-label={`${s.bookable ? 'Book' : 'Ask about'} ${s.name}`}>{s.bookable ? 'book' : 'ask'} <Icon name="arrow" size={14} /></a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <NoServices site={site} />}
          </section>
        );
      case 'team':
        return (
          <section id="team" class="tf-sec s-wrap" aria-labelledby="tf-team">
            <h2 id="tf-team" class="tf-label">{site.layout.labels.team ?? 'Studio'}</h2>
            <p class="tf-names">{site.team.map((p) => p.name).join(', ')}</p>
          </section>
        );
      case 'contact':
      case 'hours':
        if (i !== infoAt) return null;
        return (
          <section id="contact" class="tf-sec s-wrap tf-info" aria-labelledby="tf-contact">
            <div>
              <h2 id="tf-contact" class="tf-label">{site.layout.labels.visit ?? 'Contact'}</h2>
              <p>{placeLine(site)}</p>
              <ContactList site={site} icons={false} />
            </div>
            {site.layout.sections.includes('hours') && <div><h2 class="tf-label">Hours</h2><HoursList site={site} class="tf-hours" /></div>}
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="tf-sec s-wrap" aria-labelledby="tf-faq">
            <h2 id="tf-faq" class="tf-label">{site.layout.labels.faq ?? 'FAQ'}</h2>
            <FaqList site={site} class="tf-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="tf-head s-wrap">
        <h1 class="tf-name"><a href="/"><Name site={site} /></a></h1>
        <p class="tf-what">{[site.categoryLabel, site.area].filter(Boolean).join(', ') || <Hint as="span" site={site}>what you do, where</Hint>}</p>
        <nav aria-label="Sections">{nav.map((l) => <a href={l.href}>{l.label}</a>)}<a href="#services" class="tf-book">{site.cta}</a></nav>
      </header>
      <main>{site.layout.sections.map(section)}</main>
      <footer class="tf-foot s-wrap"><span>© {site.name}</span><span>{site.status.text}</span></footer>
      <MadeWith />
    </>
  );
}
