// Practice: structured and reassuring. The essentials in the first screen
// (open now, where, how to book), appointments with clear durations, then
// clinicians, hours and contact side by side.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, HoursList, Icon, Logo, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

export function Practice({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const appointments = take(site.services, site.layout.services.limit);
  const infoAt = site.layout.sections.findIndex((s) => s === 'contact' || s === 'hours');

  const section = (key: SiteSection, i: number) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'services':
        return (
          <section id="services" class="tr-sec s-wrap" aria-labelledby="tr-appointments">
            <h2 id="tr-appointments" class="tr-h2 s-display">{site.layout.labels.services ?? 'Appointments'}</h2>
            {appointments.length ? (
              <ul class="tr-list">
                {appointments.map((s) => (
                  <li><a class="tr-appt" href={s.href}>
                    <span class="tr-appt-main"><strong>{s.name}</strong>{s.description && <span>{s.description}</span>}</span>
                    <span class="tr-badge"><Icon name="clock" size={14} />{s.duration ?? 'By enquiry'}</span>
                    <span class="tr-price">{s.price}</span>
                    <span class="tr-cta">{s.bookable ? 'Book' : 'Enquire'} <Icon name="arrow" size={14} /></span>
                  </a></li>
                ))}
              </ul>
            ) : <NoServices site={site} />}
          </section>
        );
      case 'team':
        return (
          <section id="team" class="tr-sec s-wrap" aria-labelledby="tr-team">
            <h2 id="tr-team" class="tr-h2 s-display">{site.layout.labels.team ?? `Our ${site.crew}`}</h2>
            <ul class="tr-team">
              {site.team.map((p, n) => (
                <li class="tr-person">
                  <span class="tr-person-photo"><Photo site={site} img={p.photo} alt="" slot="team photo" tint={n} mono={p.initials} /></span>
                  <span class="tr-person-text"><strong>{p.name}</strong>{p.does && <small>{p.does}</small>}</span>
                  {p.href && <a href={p.href} aria-label={`Book with ${p.name}`}><Icon name="arrow" size={16} /></a>}
                </li>
              ))}
            </ul>
          </section>
        );
      case 'hours':
      case 'contact':
        if (i !== infoAt) return null;
        return (
          <section id="contact" class="tr-sec s-wrap" aria-label="Hours and contact">
            <div class="tr-info">
              {site.layout.sections.includes('hours') && (
                <div class="tr-card"><h2 class="tr-h3">Opening hours</h2><HoursList site={site} class="tr-hours" /><p class="tr-note">Times in {site.timezoneLabel} time</p></div>
              )}
              <div class="tr-card">
                <h2 class="tr-h3">{site.layout.labels.visit ?? 'Contact'}</h2>
                <p>{placeLine(site)}</p>
                {site.mapsUrl && site.onPremises && <a class="tr-link" href={site.mapsUrl} rel="noopener">Get directions <Icon name="arrow" size={14} /></a>}
                <ContactList site={site} />
              </div>
            </div>
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="tr-sec s-wrap" aria-labelledby="tr-gallery">
            <h2 id="tr-gallery" class="tr-h2 s-display">{site.layout.labels.gallery ?? 'The practice'}</h2>
            <div class="tr-gallery">{(photos.length ? photos : [null, null, null]).map((g, n) => <figure><Photo site={site} img={g} alt={`${site.name}, photo ${n + 1}`} slot="gallery photo" tint={n} /></figure>)}</div>
          </section>
        );
      }
      case 'about':
        return (
          <section id="about" class="tr-sec s-wrap" aria-label="About">
            {site.tagline ? <p class="tr-about">{site.tagline}</p> : <Hint site={site}>A line about the care you offer.</Hint>}
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="tr-sec s-wrap" aria-labelledby="tr-faq">
            <h2 id="tr-faq" class="tr-h2 s-display">{site.layout.labels.faq ?? 'FAQ'}</h2>
            <FaqList site={site} class="tr-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="tr-head">
        <div class="s-wrap tr-head-in">
          <a class="tr-brand" href="/"><Logo site={site} /><span><Name site={site} /></span></a>
          <nav aria-label="Sections">{nav.map((l) => <a href={l.href}>{l.label}</a>)}</nav>
          <a class="s-btn s-btn-accent tr-head-cta" href="#services">{site.cta}</a>
        </div>
      </header>
      <main>
        <section class="tr-hero s-wrap" aria-labelledby="tr-name">
          <div class="tr-hero-copy">
            {site.categoryLabel && <p class="tr-cat">{site.categoryLabel}</p>}
            <h1 id="tr-name" class="tr-name s-display"><Name site={site} /></h1>
            {site.tagline ? <p class="tr-tagline">{site.tagline}</p> : <Hint site={site}>Your one-line description appears here.</Hint>}
            <div class="tr-actions">
              <a class="s-btn s-btn-accent" href="#services">{site.cta}</a>
              {site.phone && <a class="s-btn s-btn-line" href={site.phone.href}><Icon name="phone" size={16} /> {site.phone.label}</a>}
            </div>
          </div>
          <aside class="tr-panel" aria-label="At a glance">
            <div class="tr-panel-photo"><Photo site={site} img={site.hero} alt="" slot="cover photo" eager tint={4} /></div>
            <ul class="tr-facts">
              <li data-open={String(site.status.open)}><Icon name="clock" size={18} /><span><strong>{site.status.open ? 'Open now' : 'Closed now'}</strong>{site.status.text.replace(/^(Open now|Closed) · /, '')}</span></li>
              <li><Icon name="pin" size={18} /><span><strong>{site.onPremises ? site.street : 'Where'}</strong>{site.onPremises ? site.area : placeLine(site)}</span></li>
              {site.lowestPrice && <li><Icon name="list" size={18} /><span><strong>{site.services.length} appointment types</strong>From {site.lowestPrice}</span></li>}
            </ul>
          </aside>
        </section>
        {site.layout.sections.map(section)}
      </main>
      <footer class="tr-foot s-wrap"><span><Name site={site} /></span><a href="#services">{site.cta}</a></footer>
      <MadeWith site={site} />
    </>
  );
}
