import type { AstroGlobal } from 'astro';
import type { BillingView } from '@bookpage/shared';
import { type ApiContext, apiFetch } from './api';

/** The signed-in owner's plan, from the API. */
export async function getBilling(ctx: ApiContext): Promise<BillingView> {
  const res = await apiFetch('/billing', ctx);
  if (!res.ok) throw new Error(`GET /billing failed: ${res.status}`);
  return ((await res.json()) as { billing: BillingView }).billing;
}

const DONE: Record<string, string> = {
  pro: 'Welcome to Pro. Your Pro templates are unlocked and the BookPage badge is off your page.',
  canceled: 'Renewal cancelled. You keep Pro until the end of your paid year.',
  resumed: 'Renewal back on. Nothing changes for you.',
  domain: 'Domain added.',
};

export function billingFlash(url: URL): { tone: 'ok' | 'bad'; text: string } | null {
  const done = url.searchParams.get('done');
  if (done && DONE[done]) return { tone: 'ok', text: DONE[done] };
  const error = url.searchParams.get('error');
  return error ? { tone: 'bad', text: error.slice(0, 200) } : null;
}

/**
 * Plan page form posts (cancel or resume the renewal; pay a test checkout), then
 * post/redirect/get to /billing with a message, so a refresh never repeats it.
 */
export async function handleBillingAction(Astro: AstroGlobal): Promise<Response | null> {
  if (Astro.request.method !== 'POST') return null;
  const form = await Astro.request.formData();
  const action = String(form.get('action') ?? '');
  const session = String(form.get('session') ?? '');
  const path = action === 'cancel' ? '/billing/cancel' : action === 'resume' ? '/billing/resume' : action === 'pay-test' ? `/billing/test/${encodeURIComponent(session)}/pay` : null;
  if (!path) return Astro.redirect('/billing', 303);

  const res = await apiFetch(path, Astro, { method: 'POST' });
  if (res.ok) return Astro.redirect(`/billing?done=${action === 'pay-test' ? 'pro' : action === 'cancel' ? 'canceled' : 'resumed'}`, 303);
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  return Astro.redirect(`/billing?error=${encodeURIComponent(body.message ?? "That didn't work. Refresh and try again.")}`, 303);
}

/** "$249", "$11" (whole amounts drop the cents). */
export function money(minor: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);
}
