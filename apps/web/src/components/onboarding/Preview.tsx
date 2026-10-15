import { CATEGORIES, type CategoryKey, formatDuration, formatMoney } from '@bookpage/shared';
import type { AboutDraft, ServiceDraft } from './model';
import { serviceTo } from './model';

/** A small live mock of the booking page, shown beside the form on wide screens. */
export function Preview(props: { about: AboutDraft; services: ServiceDraft[] }) {
  const { about } = props;
  const name = about.name.trim() || 'Your business';
  const category = about.category ? CATEGORIES[about.category as CategoryKey] : null;
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const place = about.locationType === 'online' ? 'Online' : about.locationType === 'mobile' ? 'Comes to you' : about.city.trim();

  const services = props.services
    .map((s) => ('input' in serviceTo(s) ? s : null))
    .filter((s): s is ServiceDraft => !!s)
    .slice(0, 4);

  const price = (s: ServiceDraft) => {
    const result = serviceTo(s);
    if (!('input' in result)) return '';
    const { priceType, priceMinor } = result.input;
    if (priceType === 'quote') return 'Quote';
    if (priceType === 'free') return 'Free';
    return `${priceType === 'from' ? 'From ' : ''}${formatMoney(priceMinor!, about.currency)}`;
  };

  return (
    <aside class="ob-preview" aria-label="Preview of your booking page">
      <p class="lab">Preview</p>
      <div class="box raised ob-pv">
        <div class="ob-pv-head">
          <span class="ob-pv-logo mono" aria-hidden="true">{initials}</span>
          <div>
            <strong>{name}</strong>
            <p class="lab">{[category?.label, place].filter(Boolean).join(' · ') || 'Category · City'}</p>
          </div>
        </div>
        <p class="ob-pv-desc">{about.description.trim() || 'Your one-line description shows here.'}</p>
        <ul class="ob-pv-services">
          {services.length === 0 && <li class="ob-hint">Your services show here.</li>}
          {services.map((s) => (
            <li>
              <span>
                {s.name}
                {s.priceType !== 'quote' && <small> · {formatDuration(s.durationMin)}</small>}
              </span>
              <strong>{price(s)}</strong>
            </li>
          ))}
        </ul>
        <span class="btn btn-ink ob-pv-cta" aria-hidden="true">{category?.cta ?? 'Book now'}</span>
      </div>
    </aside>
  );
}
