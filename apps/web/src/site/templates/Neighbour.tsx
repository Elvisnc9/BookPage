// Neighbour: friendly and practical. Call or book from the first screen, the
// areas you cover as tags, and how booking works in three true steps.
import type { SiteSection } from '@bookpage/shared';
import { navFor, type SiteModel, shows } from '../model';
import { ContactList, FaqList, Hint, HoursList, Icon, Logo, MadeWith, Name, NoServices, Photo, placeLine, take } from '../parts';

const STEPS = [
  { icon: 'list', title: 'Pick a service', text: 'Prices and times are on the page.' },
  { icon: 'calendar', title: 'Choose a time', text: 'Only times we are really free.' },
  { icon: 'check', title: 'You get a confirmation', text: 'By email, with a link to cancel.' },
] as const;

export function Neighbour({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const services = take(site.services, site.layout.services.limit);

  const section = (key: SiteSection) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'services':
        return (
          <section id="services" class="tn-sec s-wrap" aria-labelledby="tn-services">
            <h2 id="tn-services" class="tn-h2 s-display">{site.layout.labels.services ?? 'How we can help'}</h2>
            {services.length ? (
              <ul class="tn-services">
                {services.map((s, n) => (
                  <li><a class="tn-service" href={s.href}>
                    <span class="tn-service-photo"><Photo site={site} img={s.image} alt="" slot="photo" tint={n} mono={s.initials} /></span>
                    <span class="tn-service-text">
                      <strong class="s-display">{s.name}</strong>
                      {s.description && <span>{s.description}</span>}
                      <span class="tn-chips"><span>{s.price}</span>{s.duration && <span>{s.duration}</span>}</span>
                    </span>
                    <span class="tn-go" aria-hidden="true"><Icon name="arrow" size={20} /></span>
                  </a></li>
                ))}
              </ul>
            ) : <NoServices site={site} />}
            <ol class="tn-steps">
              {STEPS.map((s) => <li><span class="tn-step-icon"><Icon name={s.icon} size={22} /></span><strong>{s.title}</strong><span>{s.text}</span></li>)}
            </ol>
          </section>
        );
      case 'contact':
        return (
          <section id="contact" class="tn-sec s-wrap" aria-labelledby="tn-where">
            <div class="tn-where">
              <h2 id="tn-where" class="tn-h2 s-display">{site.layout.labels.visit ?? 'Where we work'}</h2>
              <p class="tn-place">{placeLine(site)}</p>
              {site.serviceAreas.length > 0 && <ul class="tn-areas">{site.serviceAreas.map((a) => <li><Icon name="pin" size={16} />{a}</li>)}</ul>}
              <ContactList site={site} />
            </div>
          </section>
        );
      case 'hours':
        return (
          <section id="hours" class="tn-sec s-wrap" aria-labelledby="tn-hours">
            <div class="tn-hours-card">
              <h2 id="tn-hours" class="tn-h3 s-display">When we're open</h2>
              <HoursList site={site} class="tn-hours" />
            </div>
          </section>
        );
      case 'team':
        return (
          <section id="team" class="tn-sec s-wrap" aria-labelledby="tn-team">
            <h2 id="tn-team" class="tn-h2 s-display">{site.layout.labels.team ?? 'Say hi to the team'}</h2>
            <ul class="tn-team">
              {site.team.map((p, n) => (
                <li><span class="tn-face"><Photo site={site} img={p.photo} alt="" slot="team photo" tint={n + 1} mono={p.initials} /></span><strong>{p.name}</strong>{p.does && <small>{p.does}</small>}</li>
              ))}
            </ul>
          </section>
        );
      case 'gallery': {
        const photos = take(site.gallery, site.layout.gallery.limit);
        return (
          <section id="gallery" class="tn-sec s-wrap" aria-labelledby="tn-gallery">
            <h2 id="tn-gallery" class="tn-h2 s-display">{site.layout.labels.gallery ?? 'Recent jobs'}</h2>
            <div class="tn-gallery">{(photos.length ? photos : [null, null, null]).map((g, n) => <figure><Photo site={site} img={g} alt={`${site.name}, job ${n + 1}`} slot="gallery photo" tint={n} /></figure>)}</div>
          </section>
        );
      }
      case 'about':
        return (
          <section id="about" class="tn-sec s-wrap" aria-label="About">
            {site.tagline ? <p class="tn-about s-display">{site.tagline}</p> : <Hint site={site}>A friendly line about your business.</Hint>}
          </section>
        );
      case 'faq':
        return (
          <section id="faq" class="tn-sec s-wrap" aria-labelledby="tn-faq">
            <h2 id="tn-faq" class="tn-h2 s-display">{site.layout.labels.faq ?? 'Questions we get a lot'}</h2>
            <FaqList site={site} class="tn-faqs" />
          </section>
        );
    }
  };

  return (
    <>
      <header class="tn-head">
        <div class="s-wrap tn-head-in">
          <a class="tn-brand" href="/"><Logo site={site} /><span class="s-display"><Name site={site} /></span></a>
          <nav aria-label="Sections">{nav.map((l) => <a href={l.href}>{l.label}</a>)}</nav>
          {site.phone && <a class="tn-phone" href={site.phone.href} aria-label={`Call ${site.phone.label}`}><Icon name="phone" size={18} /><span>{site.phone.label}</span></a>}
        </div>
      </header>
      <main>
        <section class="tn-hero s-wrap" aria-labelledby="tn-name">
          <div class="tn-hero-copy">
            <p class="tn-open" data-open={String(site.status.open)}>{site.status.text}</p>
            <h1 id="tn-name" class="tn-name s-display"><Name site={site} /></h1>
            {site.tagline ? <p class="tn-tagline">{site.tagline}</p> : <Hint site={site}>Your one-line description appears here.</Hint>}
            <div class="tn-actions">
              <a class="s-btn s-btn-accent" href="#services">{site.cta}</a>
              {site.phone && <a class="s-btn s-btn-line" href={site.phone.href}><Icon name="phone" size={18} /> Call us</a>}
            </div>
            {site.serviceAreas.length > 0 && <p class="tn-covers">We cover {site.serviceAreas.join(', ')}</p>}
          </div>
          <div class="tn-hero-photo"><Photo site={site} img={site.hero} alt={site.name} slot="cover photo" eager tint={2} mono={site.initials} /></div>
        </section>
        {site.layout.sections.map(section)}
      </main>
      <footer class="tn-foot">
        <div class="s-wrap tn-foot-in"><strong class="s-display"><Name site={site} /></strong><a class="s-btn s-btn-accent" href="#services">{site.cta}</a></div>
        <MadeWith />
      </footer>
    </>
  );
}
