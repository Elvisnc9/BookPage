import { CATEGORIES, type CategoryKey, formatDuration, fromMinor, PRICE_TYPES, type PriceType } from '@bookpage/shared';
import { useEffect } from 'preact/hooks';
import { newKey, type ServiceDraft, serviceTo } from './model';
import { Chips, Field, Section, Switch } from './ui';

const PRICE_LABELS: Record<PriceType, string> = { fixed: 'Fixed', from: 'From', quote: 'Quote only', free: 'Free' };
const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];

export function StepServices(props: {
  services: ServiceDraft[];
  onServices: (services: ServiceDraft[]) => void;
  category: CategoryKey | null;
  currency: string;
}) {
  const { services, onServices } = props;
  const symbol = currencySymbol(props.currency);

  const update = (key: string, patch: Partial<ServiceDraft>) =>
    onServices(services.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const add = () => {
    const t = CATEGORIES[props.category ?? 'other'].template;
    const first = services.length === 0;
    onServices([
      ...services,
      {
        key: newKey(),
        name: first ? t.name : '',
        priceType: t.priceMinor === null ? 'quote' : 'fixed',
        price: first && t.priceMinor !== null ? fromMinor(t.priceMinor) : '',
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
    <Section kicker="Step 2 · Services" title="What do you offer?" intro="Add what customers can book. You can change these any time.">
      <ol class="ob-services">
        {services.map((s, i) => {
          const check = serviceTo(s);
          const showProblem = 'problem' in check && (s.name.trim() !== '' || s.price !== '');
          const priced = s.priceType === 'fixed' || s.priceType === 'from';
          return (
            <li class="box ob-service">
              <div class="ob-service-head">
                <span class="ob-num mono" aria-hidden="true">{i + 1}</span>
                <Field label="Service name">
                  {(id) => (
                    <input id={id} class="ob-input" value={s.name} maxLength={80} placeholder="e.g. Silk press"
                      onInput={(e) => update(s.key, { name: e.currentTarget.value })} />
                  )}
                </Field>
                <button type="button" class="btn ob-remove" aria-label={`Remove ${s.name || 'this service'}`}
                  onClick={() => onServices(services.filter((x) => x.key !== s.key))}>
                  Remove
                </button>
              </div>

              <Chips label="Price" value={s.priceType}
                options={PRICE_TYPES.map((p) => ({ value: p, label: PRICE_LABELS[p] }))}
                onChange={(priceType) => update(s.key, { priceType, bookable: priceType === 'quote' ? false : s.bookable || s.priceType === 'quote' })} />

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
                <>
                  <Chips label="How long it takes" value={s.durationMin}
                    options={DURATIONS.map((m) => ({ value: m, label: formatDuration(m) }))}
                    onChange={(durationMin) => update(s.key, { durationMin })} />
                  <Switch label="Bookable online" checked={s.bookable}
                    note={s.bookable ? 'Customers can book this on your page.' : 'Shown on your page, but customers ask first.'}
                    onChange={(bookable) => update(s.key, { bookable })} />
                </>
              )}
              {s.priceType === 'quote' && <p class="ob-hint">Quote-only services send you an enquiry instead of a booking.</p>}

              {showProblem && <p class="ob-error">{check.problem}</p>}
            </li>
          );
        })}
      </ol>

      <button type="button" class="btn ob-add" onClick={add}>
        + Add {services.length ? 'another' : 'a'} service
      </button>
    </Section>
  );
}

function currencySymbol(currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    .formatToParts(0)
    .find((p) => p.type === 'currency')?.value ?? currency;
}
