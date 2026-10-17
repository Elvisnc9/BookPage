// Classic: the booking page Glow Studio was designed with. Warm off-white, the
// name in big type with an outlined second word, photo-led service cards.
// Styles: styles/booking.css (shared with the booking flow pages).
import type { SiteSection } from '@bookpage/shared';
import { type SiteModel, navFor, shows } from '../model';
import { ContactList, FaqList, Hint, Icon, Logo, MadeWith, Name, NoServices, Photo, take } from '../parts';

const PERKS = [
  { icon: 'bolt', title: 'Book in 30 seconds', text: 'Pick a time that suits you' },
  { icon: 'wallet', title: 'No payment to book', text: 'Nothing to pay online' },
  { icon: 'bell', title: 'Reminder the day before', text: 'By email, if you want one' },
  { icon: 'undo', title: 'Easy to cancel', text: 'From your confirmation link' },
] as const;

export function Classic({ site }: { site: SiteModel }) {
  const nav = navFor(site);
  const [firstWord, ...rest] = site.name.split(' ');
  const featured = take(site.services, site.layout.services.limit);
  const more = site.services.length > featured.length;
  const contactAt = site.layout.sections.findIndex((s) => s === 'contact' || s === 'hours');
  const contacts = [
    site.whatsapp && { href: site.whatsapp, label: 'WhatsApp', icon: 'chat' as const },
    site.phone && { href: site.phone.href, label: 'Call', icon: 'phone' as const },
    site.email && { href: `mailto:${site.email}`, label: 'Email', icon: 'mail' as const },
  ].filter((c) => !!c);

  const section = (key: SiteSection, i: number) => {
    if (!shows(site, key)) return null;
    switch (key) {
      case 'services': return <Services site={site} featured={featured} more={more} />;
      case 'about': return <About site={site} />;
      case 'gallery': return <Gallery site={site} />;
      case 'team': return <Team site={site} />;
      case 'contact':
      case 'hours': return i === contactAt ? <Visit site={site} /> : null;
      case 'faq': return <Faq site={site} />;
    }
  };

  return (
    <div class="bk">
      <header class="bk-head">
        <div class="bk-wrap bk-head-in">
          <a class="bk-brand" href="/">
            <Logo site={site} class="bk-logo" />
            <span class="bk-brand-name"><Name site={site} /></span>
          </a>
          {nav.length > 0 && (
            <nav class="bk-nav" aria-label="Sections">
              {nav.map((l) => <a href={`/${l.href}`}>{l.label}</a>)}
            </nav>
          )}
          <a class="btn btn-ink bk-head-cta" href={site.links.services}>Book now <Icon name="arrow" size={16} /></a>
          {nav.length > 0 && (
            <details class="bk-menu">
              <summary aria-label="Menu"><Icon name="menu" size={22} /></summary>
              <nav class="bk-menu-panel" aria-label="Sections">
                {nav.map((l) => <a href={`/${l.href}`}>{l.label}<Icon name="arrow" size={16} /></a>)}
              </nav>
            </details>
          )}
        </div>
      </header>

      <main>
        <section class="bk-hero" aria-labelledby="name">
          <div class="bk-hero-art" aria-hidden={site.hero ? undefined : 'true'}>
            {site.hero
              ? <Photo site={site} img={site.hero} alt={`Inside ${site.name}`} slot="cover photo" class="bk-hero-photo" eager />
              : <span class="bk-hero-mono">{site.initials}</span>}
            {!site.hero && site.mode === 'preview' && <span class="s-ph-tag bk-hero-tag">Placeholder · add a cover photo</span>}
          </div>
          <div class="bk-wrap bk-hero-in">
            <div class="bk-hero-copy">
              {site.area && <p class="bk-kicker">{site.area}</p>}
              <h1 id="name" class="bk-name">
                {!site.hasName ? <Name site={site} /> : rest.length ? <>{firstWord} <span class="bk-outline">{rest.join(' ')}</span></> : site.name}
              </h1>
              {site.tagline ? <p class="bk-tagline">{site.tagline}</p> : <Hint site={site}>Your one-line description appears here.</Hint>}
              <div class="bk-proof">
                {site.team.length > 0 && (
                  <span class="bk-stack" aria-hidden="true">
                    {take(site.team, 4).map((p, i) => (
                      <span data-tint={i % 6}>{p.photo ? <img src={p.photo.url} alt="" width="34" height="34" /> : p.initials}</span>
                    ))}
                  </span>
                )}
                <span class="bk-status" data-open={String(site.status.open)}><i aria-hidden="true"></i>{site.status.text}</span>
              </div>
              <div class="bk-hero-actions">
                <a class="btn btn-ink" href="#services">{site.cta} <Icon name="arrow" size={16} /></a>
                {site.whatsapp ? <a class="btn" href={site.whatsapp}><Icon name="chat" size={16} /> WhatsApp us</a>
                  : site.phone && <a class="btn" href={site.phone.href}><Icon name="phone" size={16} /> Call us</a>}
              </div>
            </div>

            {featured.length > 0 && (
              <nav class="bk-strip" aria-label="Popular services">
                {featured.map((s, i) => (
                  <a href={s.href}>
                    {s.image
                      ? <img class="bk-thumb" src={s.image.url} alt="" width="60" height="60" loading="lazy" />
                      : <span class="bk-thumb" data-tint={i % 6} aria-hidden="true">{s.initials}</span>}
                    <span>{s.name}</span>
                  </a>
                ))}
                <a class="bk-strip-all" href="#services" aria-label="All services"><Icon name="plus" size={18} /></a>
              </nav>
            )}
          </div>
        </section>

        <section class="bk-wrap bk-info" aria-label="At a glance">
          <ul class="bk-facts">
            <li>
              <Icon name="calendar" size={22} />
              <span><small>{site.today.closed ? 'Closed today' : 'Open today'}</small>{site.today.closed ? site.status.text.replace('Closed · ', '') : site.today.text}</span>
            </li>
            <li>
              <Icon name="pin" size={22} />
              <span><small>{site.onPremises ? site.street : 'Where'}</small>{site.onPremises ? site.area : site.area || 'Ask us'}</span>
            </li>
            {site.phone && (
              <li class="bk-fact-phone">
                <Icon name="phone" size={22} />
                <span><small>Call us</small><a href={site.phone.href}>{site.phone.label}</a></span>
              </li>
            )}
            {site.services.length > 0 && (
              <li>
                <Icon name="list" size={22} />
                <span><small>{site.services.length} {site.services.length === 1 ? 'service' : 'services'}</small>{site.lowestPrice ? `From ${site.lowestPrice}` : 'Book online'}</span>
              </li>
            )}
          </ul>
          <a class="bk-info-cta" href="#services">
            {site.gallery[0]
              ? <img class="bk-thumb" src={site.gallery[0].url} alt="" width="84" height="64" loading="lazy" />
              : <span class="bk-thumb" data-tint="2" aria-hidden="true">{site.initials}</span>}
            <strong>Book your<br />next visit</strong>
            <span class="bk-round" aria-hidden="true"><Icon name="arrow" size={18} /></span>
          </a>
        </section>

        {site.layout.sections.map(section)}
      </main>

      <footer class="bk-foot">
        <div class="bk-wrap bk-foot-in">
          <a class="bk-brand" href="/">
            <Logo site={site} class="bk-logo" />
            <span class="bk-brand-name"><Name site={site} /></span>
          </a>
          {nav.length > 0 && (
            <nav class="bk-foot-nav" aria-label="Footer">
              <a href="/">Home</a>
              {nav.map((l) => <a href={`/${l.href}`}>{l.label}</a>)}
            </nav>
          )}
          {contacts.length > 0 && (
            <ul class="bk-foot-contact" aria-label="Contact">
              {contacts.map((c) => <li><a href={c.href} aria-label={c.label}><Icon name={c.icon} size={20} /></a></li>)}
            </ul>
          )}
        </div>
        <MadeWith class="bk-made" />
      </footer>
    </div>
  );
}

function Services({ site, featured, more }: { site: SiteModel; featured: SiteModel['services']; more: boolean }) {
  return (
    <>
      <section id="services" class="bk-wrap bk-sec bk-services" aria-labelledby="services-title">
        <div class="bk-sec-intro">
          <p class="bk-kicker">{site.layout.labels.services ?? 'Services'}</p>
          <h2 id="services-title" class="bk-h2">Choose your service</h2>
          <p class="bk-lede">Pick what you'd like, then choose a time. It takes about 30 seconds.</p>
        </div>
        {featured.length ? (
          <ul class="bk-cards">
            {featured.map((s, i) => (
              <li><a class="bk-svc" href={s.href} data-tint={i % 6}>
                {s.image
                  ? <img class="bk-svc-photo" src={s.image.url} alt="" loading="lazy" decoding="async" />
                  : <span class="bk-svc-mono" aria-hidden="true">{s.initials}</span>}
                {!s.image && site.mode === 'preview' && <span class="s-ph-tag bk-svc-tag">Placeholder · add a photo</span>}
                <span class="bk-svc-dur">{s.bookable ? s.duration : 'Ask for a quote'}</span>
                <span class="bk-svc-foot">
                  <span><strong>{s.name}</strong><small>{s.price}</small></span>
                  <span class="bk-round bk-round-light" aria-hidden="true"><Icon name="arrow" size={16} /></span>
                </span>
              </a></li>
            ))}
          </ul>
        ) : <NoServices site={site} />}
        {more && (
          <details class="bk-more">
            <summary class="btn">View all {site.services.length} services <Icon name="arrow" size={16} /></summary>
            <ul class="bk-rows">
              {site.services.map((s) => (
                <li><a class="bk-row" href={s.href}>
                  <span><strong>{s.name}</strong><small>{s.bookable ? s.duration : 'Ask for a quote'}{s.description ? ` · ${s.description}` : ''}</small></span>
                  <span class="bk-row-side"><strong>{s.price}</strong><small>{s.bookable ? 'Book' : 'Ask'} <Icon name="arrow" size={14} /></small></span>
                </a></li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section class="bk-wrap" aria-label="Booking with us">
        <ul class="bk-perks">
          {PERKS.map((p) => <li><Icon name={p.icon} size={26} /><span><strong>{p.title}</strong><small>{p.text}</small></span></li>)}
        </ul>
      </section>

      <section class="bk-wrap bk-sec bk-cta" aria-labelledby="cta-title">
        <div class="bk-cta-art" data-tint="1">
          {site.gallery[0] ?? site.hero
            ? <img class="bk-cta-photo" src={(site.gallery[0] ?? site.hero)!.url} alt="" loading="lazy" decoding="async" />
            : <span class="bk-hero-mono" aria-hidden="true">{site.initials}</span>}
          <p><strong>Step inside {site.name}</strong>{site.onPremises ? <span>{[site.street, site.area].filter(Boolean).join(', ')}</span> : site.area && <span>{site.area}</span>}</p>
        </div>
        <div class="bk-cta-card">
          <p class="bk-kicker">Book your visit</p>
          <h2 id="cta-title" class="bk-h2">Let's get you booked</h2>
          <p class="bk-lede">Choose a service, pick a time and you're done. We'll send a confirmation to your email.</p>
          <div class="bk-hero-actions">
            <a class="btn btn-ink" href="#services">{site.cta} <Icon name="arrow" size={16} /></a>
            <a class="btn" href={site.links.enquire}>Ask a question</a>
          </div>
          <a class="bk-round bk-round-peach bk-cta-go" href="#services" aria-label={site.cta}><Icon name="arrow" size={20} /></a>
        </div>
      </section>
    </>
  );
}

function About({ site }: { site: SiteModel }) {
  return (
    <section id="about" class="bk-wrap bk-sec" aria-labelledby="about-title">
      <p class="bk-kicker">{site.layout.labels.about ?? 'About'}</p>
      <h2 id="about-title" class="bk-h2">{site.tagline ?? <span class="s-hint-inline">A line about what you do and who it's for.</span>}</h2>
    </section>
  );
}

function Gallery({ site }: { site: SiteModel }) {
  const photos = take(site.gallery, site.layout.gallery.limit);
  return (
    <section id="gallery" class="bk-wrap bk-sec" aria-labelledby="gallery-title">
      <p class="bk-kicker">{site.layout.labels.gallery ?? 'Gallery'}</p>
      <h2 id="gallery-title" class="bk-h2">A look inside</h2>
      <ul class="bk-gallery">
        {photos.length
          ? photos.map((g, i) => <li><Photo site={site} img={g} alt={`${site.name}, photo ${i + 1}`} slot="gallery photo" /></li>)
          : [0, 1, 2].map((i) => <li><Photo site={site} img={null} alt="" slot="gallery photo" tint={i + 2} /></li>)}
      </ul>
    </section>
  );
}

function Team({ site }: { site: SiteModel }) {
  return (
    <section id="team" class="bk-wrap bk-sec" aria-labelledby="team-title">
      <p class="bk-kicker">{site.layout.labels.team ?? 'Meet the team'}</p>
      <h2 id="team-title" class="bk-h2">Your {site.crew}</h2>
      <ul class="bk-team">
        {site.team.map((p, i) => (
          <li class="bk-person">
            {p.photo
              ? <img class="bk-avatar" src={p.photo.url} alt="" loading="lazy" decoding="async" />
              : <span class="bk-avatar" data-tint={(i + 3) % 6} aria-hidden="true">{p.initials}</span>}
            <span class="bk-person-text">
              <strong>{p.name}</strong>
              {p.does && <small>{p.does}</small>}
              <small>{p.serviceCount} {p.serviceCount === 1 ? 'service' : 'services'}</small>
            </span>
            {p.href && <a class="bk-round" href={p.href} aria-label={`Book with ${p.name}`}><Icon name="arrow" size={16} /></a>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Visit({ site }: { site: SiteModel }) {
  return (
    <section id="contact" class="bk-wrap bk-sec" aria-labelledby="visit-title">
      <p class="bk-kicker">{site.onPremises ? 'Visit us' : 'Get in touch'}</p>
      <h2 id="visit-title" class="bk-h2">{site.onPremises ? `Find us${site.area ? ` in ${site.area.split(',')[0]}` : ''}` : 'Say hello'}</h2>
      <div class="bk-visit">
        <div class="bk-place">
          {site.onPremises && (
            <div class="bk-map" aria-hidden="true">
              <span class="bk-map-pin"><Icon name="pin" size={30} /></span>
              <span class="bk-map-label">{site.street}</span>
            </div>
          )}
          <div class="bk-place-text">
            {site.onPremises ? (
              <>
                <p><strong>{site.address}</strong></p>
                {site.mapsUrl && <a class="btn btn-ink" href={site.mapsUrl} rel="noopener">Get directions <Icon name="arrow" size={16} /></a>}
              </>
            ) : (
              <p><strong>{site.locationType === 'online' ? 'We meet online' : 'We come to you'}</strong></p>
            )}
            {site.serviceAreas.length > 0 && <p><small>We travel to</small>{site.serviceAreas.join(', ')}</p>}
            <ContactList site={site} class="bk-contact" />
          </div>
        </div>
        <div class="bk-hours-card">
          <h3>Opening hours</h3>
          <dl class="bk-hours">
            {site.days.map((h) => (
              <div data-today={h.today || undefined}><dt>{h.short}{h.today && <span class="bk-sr"> (today)</span>}</dt><dd>{h.text}</dd></div>
            ))}
          </dl>
          <p class="bk-note">Times in {site.timezoneLabel} time</p>
        </div>
      </div>
    </section>
  );
}

function Faq({ site }: { site: SiteModel }) {
  return (
    <section id="faq" class="bk-wrap bk-sec" aria-labelledby="faq-title">
      <div class="bk-sec-head">
        <div>
          <p class="bk-kicker">{site.layout.labels.faq ?? 'FAQ'}</p>
          <h2 id="faq-title" class="bk-h2">Quick answers</h2>
        </div>
        <a class="bk-link" href={site.links.enquire}>Still have questions? <Icon name="arrow" size={14} /></a>
      </div>
      <FaqList site={site} class="bk-faqs" />
    </section>
  );
}
