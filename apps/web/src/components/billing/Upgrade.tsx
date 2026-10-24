// Choosing the domain that comes with Pro, then going to payment. Also used on its
// own (mode "domain") by a Pro owner who skipped the domain at checkout.
import { type DomainOption, domainNameSchema, INCLUDED_DOMAIN_MAX_MINOR, PRO_PRICE } from '@bookpage/shared';
import { useEffect, useRef, useState } from 'preact/hooks';
import { api, ApiError } from '../onboarding/api';
import './upgrade.css';

type Choice = 'new' | 'own' | 'skip';

const usd = (minor: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);

/** "Glow Studio & Spa" → "glowstudiospa" */
export const labelFrom = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '').slice(0, 40);

export default function Upgrade(props: { mode: 'checkout' | 'domain'; businessName: string; testMode: boolean }) {
  const [choice, setChoice] = useState<Choice>('new');
  const [query, setQuery] = useState(() => labelFrom(props.businessName));
  const [options, setOptions] = useState<DomainOption[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [own, setOwn] = useState('');
  const [ownError, setOwnError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ticket = useRef(0);

  // Search as they type (debounced); the latest answer wins.
  useEffect(() => {
    if (choice !== 'new') return;
    const q = query.trim();
    if (q.length < 2) return setOptions(null);
    setSearching(true);
    const mine = ++ticket.current;
    const timer = setTimeout(async () => {
      try {
        const r = await api<{ options: DomainOption[] }>('GET', `/billing/domains?query=${encodeURIComponent(q)}`);
        if (mine !== ticket.current) return;
        setOptions(r.options);
        setSearchError('');
        setPicked((p) => (p && r.options.some((o) => o.name === p && o.included) ? p : r.options.find((o) => o.included)?.name ?? null));
      } catch (e) {
        if (mine === ticket.current) setSearchError(e instanceof ApiError ? e.message : "Couldn't search. Check your connection.");
      } finally {
        if (mine === ticket.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, choice]);

  const domain = () => {
    if (choice === 'new') return picked ? { name: picked, mode: 'register' as const } : undefined;
    if (choice === 'own') {
      const r = domainNameSchema.safeParse(own);
      return r.success ? { name: r.data, mode: 'connect' as const } : undefined;
    }
    return null;
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    setError('');
    const d = domain();
    if (d === undefined) {
      if (choice === 'own') return setOwnError('Use a domain like yourname.com');
      return setError('Pick a domain, or choose another option');
    }
    setBusy(true);
    try {
      if (props.mode === 'domain') {
        await api('POST', '/billing/domain', { domain: d });
        location.assign('/billing?done=domain');
      } else {
        const { url } = await api<{ url: string }>('POST', '/billing/checkout', { domain: d });
        location.assign(url);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That didn't work. Check your connection and try again.");
      setBusy(false);
    }
  };

  const chosen = domain();
  return (
    <form class="up" onSubmit={submit} noValidate>
      <fieldset class="up-choices">
        <legend class="ap-h2">{props.mode === 'domain' ? 'Add your domain' : 'Your domain'}</legend>
        <p class="up-muted">One standard domain (up to {usd(INCLUDED_DOMAIN_MAX_MINOR)} a year) is included with Pro and registered in your name.</p>

        <label class="up-choice" data-on={choice === 'new' || undefined}>
          <input type="radio" name="choice" value="new" checked={choice === 'new'} onChange={() => setChoice('new')} />
          <span><strong>Find a new one</strong><small>We register it for you after you pay.</small></span>
        </label>
        {choice === 'new' && (
          <div class="up-panel">
            <label class="lab" for="up-query">Search for a name</label>
            <input id="up-query" class="up-input mono" value={query} onInput={(e) => setQuery(e.currentTarget.value)} autocomplete="off" spellcheck={false} maxLength={63} />
            <p class="up-status" role="status" aria-live="polite">{searching ? 'Searching…' : searchError || (options && !options.length ? 'Type at least two letters.' : '')}</p>
            {options && options.length > 0 && (
              <ul class="up-results" aria-label="Domains">
                {options.map((o) => (
                  <li>
                    <label class="up-result" data-off={!o.included || undefined}>
                      <input type="radio" name="domain" value={o.name} checked={picked === o.name} disabled={!o.included} onChange={() => setPicked(o.name)} />
                      <span class="mono up-name">{o.name}</span>
                      <span class="up-price">
                        {!o.available ? 'Taken' : o.included ? <><s>{usd(o.priceMinor!)}/yr</s> Included</> : `${usd(o.priceMinor!)}/yr, not included`}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <label class="up-choice" data-on={choice === 'own' || undefined}>
          <input type="radio" name="choice" value="own" checked={choice === 'own'} onChange={() => setChoice('own')} />
          <span><strong>I already have one</strong><small>Keep it where it's registered; you point it at your page with one DNS record.</small></span>
        </label>
        {choice === 'own' && (
          <div class="up-panel">
            <label class="lab" for="up-own">Your domain</label>
            <input id="up-own" class="up-input mono" value={own} placeholder="yourname.com" autocomplete="off" spellcheck={false}
              aria-invalid={ownError ? 'true' : undefined} aria-describedby={ownError ? 'up-own-error' : undefined}
              onInput={(e) => { setOwn(e.currentTarget.value); setOwnError(''); }} />
            {ownError && <p id="up-own-error" class="up-error" role="alert">{ownError}</p>}
          </div>
        )}

        {props.mode === 'checkout' && (
          <label class="up-choice" data-on={choice === 'skip' || undefined}>
            <input type="radio" name="choice" value="skip" checked={choice === 'skip'} onChange={() => setChoice('skip')} />
            <span><strong>Skip for now</strong><small>Add your included domain any time from your plan page.</small></span>
          </label>
        )}
      </fieldset>

      <div class="up-summary">
        {props.mode === 'checkout' && (
          <dl>
            <div><dt>BookPage Pro, 1 year</dt><dd>{usd(PRO_PRICE.amountMinor)}</dd></div>
            <div><dt>Domain{chosen ? <span class="mono"> {chosen.name}</span> : null}</dt><dd>{chosen ? (chosen.mode === 'register' ? 'Included' : 'Yours, connected') : 'Later'}</dd></div>
            <div class="up-total"><dt>Today</dt><dd>{usd(PRO_PRICE.amountMinor)}</dd></div>
          </dl>
        )}
        {error && <p class="up-error" role="alert">{error}</p>}
        <button type="submit" class="btn btn-primary" disabled={busy} data-busy={busy || undefined}>
          {props.mode === 'domain' ? (busy ? 'Adding…' : 'Add this domain') : busy ? 'Opening checkout…' : 'Continue to payment'}
        </button>
        {props.mode === 'checkout' && (
          <p class="up-muted">{props.testMode ? 'Test mode: the next page is a pretend checkout. No money moves.' : 'Renews yearly. Cancel any time; Pro stays on until the end of your paid year.'}</p>
        )}
      </div>
    </form>
  );
}
