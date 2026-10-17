import { CATEGORIES, type CategoryKey, formatDuration, fromMinor, type OwnerBusiness, PRICE_TYPES, type PriceType } from '@bookpage/shared';
import { useEffect } from 'preact/hooks';
import { Icon } from '../../site/parts';
import { ImageSlot } from './ImageSlot';
import { type ListEdit, newKey, type ServiceDraft, serviceTo } from './model';
import { Chips, Field, Section, Switch } from './ui';

const PRICE_LABELS: Record<PriceType, string> = { fixed: 'Fixed', from: 'From', quote: 'Quote only', free: 'Free' };
const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360, 480];

export function StepServices(props: {
  /** Overrides the onboarding heading (used on My page). */
  heading?: { kicker?: string; title: string; intro?: string; scan?: string };
  services: ServiceDraft[];
  onServices: ListEdit<ServiceDraft>;
  category: CategoryKey | null;
  currency: string;
  /** Photos: the saved business and how to update it. Omitted on My page for now. */
  media?: { biz: OwnerBusiness; onBiz: (b: OwnerBusiness) => void };
}) {
  const { services, onServices, media } = props;
  const symbol = currencySymbol(props.currency);

  const update = (key: string, patch: Partial<ServiceDraft>) =>
    onServices((cur) => cur.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const add = () => {
    const t = CATEGORIES[props.category ?? 'other'].template;
    onServices((cur) => [
      ...cur,
      {
        key: newKey(),
        name: cur.length === 0 ? t.name : '',
        description: '',
        priceType: t.priceMinor === null ? 'quote' : 'fixed',
        price: cur.length === 0 && t.priceMinor !== null ? fromMinor(t.priceMinor) : '',
        durationMin: t.durationMin,
        bufferMin: 0,
        bookable: t.priceMinor !== null,
      },
    ]);
  };

  // Start from the category's typical service rather than an empty list.
  useEffect(() => {
    if (services.length === 0) add();
  }, []);

  return (
    <Section {...(props.heading ?? { title: 'Add your services', scan: 'services', intro: 'What customers can book, with prices and how long each takes. Photos are optional.' })}>
      <ol class="ob-services">
        {services.map((s, i) => {
          const check = serviceTo(s);
          const showProblem = 'problem' in check && (s.name.trim() !== '' || s.price !== '');
          const priced = s.priceType === 'fixed' || s.priceType === 'from';
          const image = media && s.id ? media.biz.services.find((x) => x.id === s.id)?.image ?? null : null;
          const durations = DURATIONS.includes(s.durationMin) ? DURATIONS : [...DURATIONS, s.durationMin].sort((a, b) => a - b);
          return (
            <li class="ob-card ob-service" key={s.key}>
              <div class="ob-service-top">
                <span class="ob-num mono" aria-hidden="true">{i + 1}</span>
                <Field label="Service name">
                  {(id) => (
                    <input id={id} class="ob-input" value={s.name} maxLength={80} placeholder="e.g. Silk press"
                      onInput={(e) => update(s.key, { name: e.currentTarget.value })} />
                  )}
                </Field>
                <button type="button" class="ob-icon-btn" aria-label={`Remove ${s.name || 'this service'}`}
                  onClick={() => onServices((cur) => cur.filter((x) => x.key !== s.key))}>
                  <Icon name="plus" size={20} class="ob-x" />
                </button>
              </div>

              <div class={media ? 'ob-service-body' : 'ob-service-body ob-service-body-plain'}>
                {media && (
                  <ImageSlot kind="service" shape="portrait" image={image} label="Add photo" targetId={s.id} onBiz={media.onBiz} hint={false}
                    blocked={s.id ? undefined : 'input' in check ? 'Saving…' : 'Name and price first'} />
                )}
                <div class="ob-service-fields">
                  <Chips label="How it's priced" value={s.priceType}
                    options={PRICE_TYPES.map((p) => ({ value: p, label: PRICE_LABELS[p] }))}
                    onChange={(priceType) => update(s.key, { priceType, bookable: priceType === 'quote' ? false : s.bookable || s.priceType === 'quote' })} />
                  <div class="ob-grid ob-grid-2">
                    {priced && (
                      <Field label={s.priceType === 'from' ? 'Starting price' : 'Price'}>
                        {(id) => (
                          <div class="ob-money">
                            <span aria-hidden="true">{symbol}</span>
                            <input id={id} class="ob-input" inputMode="decimal" value={s.price} placeholder="45"
                              onInput={(e) => update(s.key, { price: e.currentTarget.value.replace(/[^\d.,]/g, '') })} />
                          </div>
                        )}
                      </Field>
                    )}
                    {s.priceType !== 'quote' && (
                      <Field label="How long it takes">
                        {(id) => (
                          <select id={id} class="ob-input" value={s.durationMin} onChange={(e) => update(s.key, { durationMin: Number(e.currentTarget.value) })}>
                            {durations.map((m) => <option value={m}>{formatDuration(m)}</option>)}
                          </select>
                        )}
                      </Field>
                    )}
                  </div>
                  <Field label="Short description (optional)" hint={`${s.description.length}/300`}>
                    {(id, d) => (
                      <textarea id={id} aria-describedby={d} class="ob-input" rows={2} maxLength={300} value={s.description}
                        placeholder="What's included, who it's for"
                        onInput={(e) => update(s.key, { description: e.currentTarget.value })} />
                    )}
                  </Field>
                  {s.priceType !== 'quote' ? (
                    <Switch label="Bookable online" checked={s.bookable}
                      note={s.bookable ? 'Customers book a time on your page.' : 'Shown on your page; customers ask first.'}
                      onChange={(bookable) => update(s.key, { bookable })} />
                  ) : <p class="ob-hint">Quote-only services send you an enquiry instead of a booking.</p>}
                </div>
              </div>
              {showProblem && <p class="ob-error" role="alert">{check.problem}</p>}
            </li>
          );
        })}
      </ol>

      <button type="button" class="ob-add" onClick={add}>
        <Icon name="plus" size={18} /> Add {services.length ? 'another' : 'a'} service
      </button>
    </Section>
  );
}

function currencySymbol(currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    .formatToParts(0)
    .find((p) => p.type === 'currency')?.value ?? currency;
}
