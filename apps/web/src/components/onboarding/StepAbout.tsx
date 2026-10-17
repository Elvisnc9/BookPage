import { CATEGORIES, CATEGORY_KEYS, CURRENCIES, GALLERY_MAX, type OwnerBusiness } from '@bookpage/shared';
import { useState } from 'preact/hooks';
import { Icon } from '../../site/parts';
import type { FieldIssue } from './api';
import { issueFor } from './autosave';
import { ImageSlot } from './ImageSlot';
import { type AboutDraft, COUNTRIES, COUNTRY_ZONES, countryName, needsAddress, needsAreas, zoneLabel } from './model';
import { Card, Chips, Field, Section } from './ui';

const LOCATION_OPTIONS = [
  { value: 'premises', label: 'At my address' },
  { value: 'mobile', label: 'I go to customers' },
  { value: 'online', label: 'Online' },
  { value: 'both', label: 'A mix' },
] as const;

export function StepAbout(props: {
  about: AboutDraft;
  onAbout: (patch: Partial<AboutDraft>) => void;
  issues: FieldIssue[];
  biz: OwnerBusiness;
  onBiz: (b: OwnerBusiness) => void;
}) {
  const { about, onAbout, issues, biz } = props;
  const [area, setArea] = useState('');
  const [sameWhatsapp, setSameWhatsapp] = useState(() => !!about.phone && about.whatsapp === about.phone);

  const addArea = () => {
    const value = area.trim();
    if (value && !about.serviceAreas.includes(value)) onAbout({ serviceAreas: [...about.serviceAreas, value] });
    setArea('');
  };
  const setPhone = (phone: string) => onAbout(sameWhatsapp ? { phone, whatsapp: phone } : { phone });

  return (
    <Section title="About your business" scan="business" intro="The basics customers see first. Everything saves as you type.">
      <Card title="Your business">
        <Field label="Business name" error={issueFor(issues, 'name')}>
          {(id, d) => (
            <input id={id} aria-describedby={d} class="ob-input" value={about.name} maxLength={80} autoComplete="organization"
              onInput={(e) => onAbout({ name: e.currentTarget.value })} />
          )}
        </Field>
        <Chips label="What kind of business?" options={CATEGORY_KEYS.map((k) => ({ value: k, label: CATEGORIES[k].label }))}
          value={about.category ?? ('' as never)} onChange={(category) => onAbout({ category })} />
        <Field label="One line about you" hint={`${about.description.length}/160`} error={issueFor(issues, 'description')}>
          {(id, d) => (
            <textarea id={id} aria-describedby={d} class="ob-input" rows={2} maxLength={160} value={about.description}
              placeholder="Silk presses, braids and colour in a calm little studio."
              onInput={(e) => onAbout({ description: e.currentTarget.value })} />
          )}
        </Field>
      </Card>

      <Card title="Where customers find you">
        <Chips label="Where do you work?" options={LOCATION_OPTIONS} value={about.locationType} onChange={(locationType) => onAbout({ locationType })} />
        {needsAddress(about.locationType) && (
          <div class="ob-grid ob-grid-3">
            <Field label="Street address" error={issueFor(issues, 'addressLine1')}>
              {(id, d) => <input id={id} aria-describedby={d} class="ob-input" value={about.addressLine1} autoComplete="address-line1" onInput={(e) => onAbout({ addressLine1: e.currentTarget.value })} />}
            </Field>
            <Field label="City" error={issueFor(issues, 'city')}>
              {(id, d) => <input id={id} aria-describedby={d} class="ob-input" value={about.city} autoComplete="address-level2" onInput={(e) => onAbout({ city: e.currentTarget.value })} />}
            </Field>
            <Field label="Postcode / ZIP" error={issueFor(issues, 'postalCode')}>
              {(id, d) => <input id={id} aria-describedby={d} class="ob-input" value={about.postalCode} autoComplete="postal-code" onInput={(e) => onAbout({ postalCode: e.currentTarget.value })} />}
            </Field>
          </div>
        )}
        {needsAreas(about.locationType) && (
          <Field label="Areas you travel to" hint="Press Enter after each one, e.g. Brooklyn, Queens.">
            {(id, d) => (
              <div>
                <input id={id} aria-describedby={d} class="ob-input" value={area} enterKeyHint="done"
                  onInput={(e) => setArea(e.currentTarget.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addArea(); } }}
                  onBlur={addArea} />
                {about.serviceAreas.length > 0 && (
                  <ul class="ob-tags">
                    {about.serviceAreas.map((a) => (
                      <li>{a}<button type="button" aria-label={`Remove ${a}`} onClick={() => onAbout({ serviceAreas: about.serviceAreas.filter((x) => x !== a) })}><Icon name="plus" size={16} class="ob-x" /></button></li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Field>
        )}
        <details class="ob-more">
          <summary>Country, time zone and currency <span class="mono">{about.country} · {zoneLabel(about.timezone)} · {about.currency}</span></summary>
          <div class="ob-more-body ob-grid ob-grid-3">
            <Field label="Country">
              {(id, d) => (
                <select id={id} aria-describedby={d} class="ob-input" value={about.country}
                  onChange={(e) => {
                    const country = e.currentTarget.value;
                    const zones = COUNTRY_ZONES[country] ?? [];
                    onAbout({ country, currency: COUNTRIES[country] ?? about.currency, timezone: zones.includes(about.timezone) ? about.timezone : zones[0] ?? about.timezone });
                  }}>
                  {Object.keys(COUNTRIES).map((c) => <option value={c}>{countryName(c)}</option>)}
                </select>
              )}
            </Field>
            <Field label="Time zone" hint="Hours and bookings use this.">
              {(id, d) => {
                const zones = COUNTRY_ZONES[about.country] ?? [];
                const options = zones.includes(about.timezone) ? zones : [about.timezone, ...zones];
                return (
                  <select id={id} aria-describedby={d} class="ob-input" value={about.timezone} onChange={(e) => onAbout({ timezone: e.currentTarget.value })}>
                    {options.map((z) => <option value={z}>{zoneLabel(z)}</option>)}
                  </select>
                );
              }}
            </Field>
            <Field label="Currency">
              {(id) => (
                <select id={id} class="ob-input" value={about.currency} onChange={(e) => onAbout({ currency: e.currentTarget.value })}>
                  {CURRENCIES.map((c) => <option value={c}>{c}</option>)}
                </select>
              )}
            </Field>
          </div>
        </details>
      </Card>

      <Card title="How customers reach you" hint="Shown on your page. Your sign-in email stays private.">
        <div class="ob-grid ob-grid-2">
          <Field label="Phone" error={issueFor(issues, 'phone')}>
            {(id, d) => <input id={id} aria-describedby={d} class="ob-input" type="tel" inputMode="tel" autoComplete="tel" value={about.phone} onInput={(e) => setPhone(e.currentTarget.value)} />}
          </Field>
          <Field label="WhatsApp (optional)" error={issueFor(issues, 'whatsapp')}>
            {(id, d) => (
              <div class="ob-stack">
                <input id={id} aria-describedby={d} class="ob-input" type="tel" inputMode="tel" value={about.whatsapp} disabled={sameWhatsapp}
                  onInput={(e) => onAbout({ whatsapp: e.currentTarget.value })} />
                <label class="ob-check">
                  <input type="checkbox" checked={sameWhatsapp}
                    onChange={(e) => { const on = e.currentTarget.checked; setSameWhatsapp(on); onAbout({ whatsapp: on ? about.phone : '' }); }} />
                  Same as phone
                </label>
              </div>
            )}
          </Field>
        </div>
        <Field label="Contact email (optional)" error={issueFor(issues, 'email')}>
          {(id, d) => <input id={id} aria-describedby={d} class="ob-input" type="email" inputMode="email" autoComplete="email" value={about.email} onInput={(e) => onAbout({ email: e.currentTarget.value })} />}
        </Field>
      </Card>

      <Card title="Logo and photos" hint="Optional, and you can add them later. Until then your page uses tidy placeholders.">
        <div class="ob-media-row">
          <div class="ob-media-logo">
            <span class="lab">Logo</span>
            <ImageSlot kind="logo" shape="logo" image={biz.logo} label="Add logo" onBiz={props.onBiz} />
          </div>
          <div class="ob-media-hero">
            <span class="lab">Cover photo</span>
            <ImageSlot kind="hero" shape="wide" image={biz.hero} label="Add a cover photo" onBiz={props.onBiz} />
          </div>
        </div>
        <div class="ob-gallery-edit">
          <span class="lab">Gallery <span class="ob-count">{biz.gallery.length}/{GALLERY_MAX}</span></span>
          <ul>
            {biz.gallery.map((g) => (
              <li key={g.id}><ImageSlot kind="gallery" shape="square" image={g} label="Photo" onBiz={props.onBiz} hint={false} /></li>
            ))}
            {biz.gallery.length < GALLERY_MAX && (
              <li><ImageSlot kind="gallery" shape="square" image={null} label="Add photos" onBiz={props.onBiz} adder hint={false} /></li>
            )}
          </ul>
          <p class="ob-hint">Your space, your work, your team. Any shape works.</p>
        </div>
      </Card>
    </Section>
  );
}
