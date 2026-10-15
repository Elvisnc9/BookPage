import type { APIRoute } from 'astro';
import { joinWaitlist } from '../lib/marketing';

/** Pro waitlist form (plain POST, works without JavaScript). Redirects back to where it was posted from. */
export const POST: APIRoute = async ({ request, redirect, url }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  const from = String(form.get('from') ?? '/');
  const back = new URL(from.startsWith('/') && !from.startsWith('//') ? from : '/', url);

  // Bots fill every field; people never see this one.
  if (String(form.get('company') ?? '')) return redirect(`${back.pathname}?joined=1#pro`, 303);

  const result = await joinWaitlist(email, request);
  back.search = result.ok ? '?joined=1' : `?waitlist_error=${encodeURIComponent(result.message)}`;
  return redirect(`${back.pathname}${back.search}#pro`, 303);
};
