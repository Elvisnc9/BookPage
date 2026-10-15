import { CATEGORIES, CATEGORY_KEYS, CURRENCIES } from '@bookpage/shared';
import { useState } from 'preact/hooks';
import type { FieldIssue } from './api';
import { issueFor } from './autosave';
import { HoursEditor } from './HoursEditor';
import { type AboutDraft, COUNTRIES, COUNTRY_ZONES, countryName, type DayDraft, needsAddress, needsAreas, zoneLabel } from './model';
import { Chips, Field, Section } from './ui';

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
  days: DayDraft[];
  onDays: (days: DayDraft[]) => void;
}) {
  const { about, onAbout, issues, days, onDays } = props;
  const [area, setArea] = useState('');

  const addArea = () => {
    const value = area.trim();
    if (value && !about.serviceAreas.includes(value)) onAbout({ serviceAreas: [...about.serviceAreas, value] });
    setArea('');
  };

  return (
    <Section kicker="Step 1 · About" title="Your business" intro="This is what customers see at the top of your page.">
      <Chips
        label="What kind of business?"
        options={CATEGORY_KEYS.map((k) => ({ value: k, label: CATEGORIES[k].label }))}
        value={about.category ?? ('' as never)}
        onChange={(category) => onAbout({ category })}
      />

      <Field label="Business name" error={issueFor(issues, 'name')}>
        {(id, d) => (
          <input id={id} aria-describedby={d} class="ob-input" value={about.name} maxLength={80} autoComplete="organization"
            onInput={(e) => onAbout({ name: e.currentTarget.value })} />
        )}
      </Field>

      <Field label="One line about you" hint={`${160 - about.description.length} characters left`} error={issueFor(issues, 'description')}>
        {(id, d) => (
          <textarea id={id} aria-describedby={d} class="ob-input" rows={2} maxLength={160} value={about.description}
            placeholder="Silk presses, braids and colour in a calm little studio."
            onInput={(e) => onAbout({ description: e.currentTarget.value })} />
        )}
      </Field>

      <Chips label="Where do you work?" options={LOCATION_OPTIONS} value={about.locationType} onChange={(locationType) => onAbout({ locationType })} />

      {needsAddress(about.locationType) && (
        <div class="ob-grid">
          <Field label="Street address" error={issueFor(issues, 'addressLine1')}>
            {(id, d) => (
              <input id={id} aria-describedby={d} class="ob-input" value={about.addressLine1} autoComplete="address-line1"
                onInput={(e) => onAbout({ addressLine1: e.currentTarget.value })} />
            )}
          </Field>
          <Field label="City" error={issueFor(issues, 'city')}>
            {(id, d) => (
              <input id={id} aria-describedby={d} class="ob-input" value={about.city} autoComplete="address-level2"
                onInput={(e) => onAbout({ city: e.currentTarget.value })} />
            )}
          </Field>
          <Field label="Postcode / ZIP" error={issueFor(issues, 'postalCode')}>
            {(id, d) => (
              <input id={id} aria-describedby={d} class="ob-input" value={about.postalCode} autoComplete="postal-code"
                onInput={(e) => onAbout({ postalCode: e.currentTarget.value })} />
            )}
          </Field>
        </div>
      )}

      {needsAreas(about.locationType) && (
        <Field label="Areas you travel to" hint="Press Enter after each one, e.g. Brooklyn, Queens.">
          {(id, d) => (
            <div>
              <input id={id} aria-describedby={d} class="ob-input" value={area}
                onInput={(e) => setArea(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addArea(); } }}
                onBlur={addArea} />
              {about.serviceAreas.length > 0 && (
                <ul class="ob-tags">
                  {about.serviceAreas.map((a) => (
                    <li>
                      {a}
                      <button type="button" aria-label={`Remove ${a}`} onClick={() => onAbout({ serviceAreas: about.serviceAreas.filter((x) => x !== a) })}>×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Field>
      )}

      <div class="ob-grid">
        <Field label="Country">
          {(id, d) => (
            <select id={id} aria-describedby={d} class="ob-input" value={about.country}
              onChange={(e) => {
                const country = e.currentTarget.value;
                const zones = COUNTRY_ZONES[country] ?? [];
                onAbout({
                  country,
                  currency: COUNTRIES[country] ?? about.currency,
                  timezone: zones.includes(about.timezone) ? about.timezone : zones[0] ?? about.timezone,
                });
              }}>
              {Object.keys(COUNTRIES).map((c) => <option value={c}>{countryName(c)}</option>)}
            </select>
          )}
        </Field>
        <Field label="Time zone" hint="Your opening hours and bookings use this time zone.">
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

      <div class="ob-grid">
        <Field label="Phone" hint="Shown on your page so customers can call." error={issueFor(issues, 'phone')}>
          {(id, d) => (
            <input id={id} aria-describedby={d} class="ob-input" type="tel" inputMode="tel" autoComplete="tel" value={about.phone}
              onInput={(e) => onAbout({ phone: e.currentTarget.value })} />
          )}
        </Field>
        <Field label="Contact email (optional)" error={issueFor(issues, 'email')}>
          {(id, d) => (
            <input id={id} aria-describedby={d} class="ob-input" type="email" inputMode="email" autoComplete="email" value={about.email}
              onInput={(e) => onAbout({ email: e.currentTarget.value })} />
          )}
        </Field>
      </div>

      <HoursEditor days={days} onDays={onDays} />
    </Section>
  );
}
