import { API_URL, PROXY_SECRET } from 'astro:env/server';

export interface Me {
  user: { id: string; email: string; name: string | null; avatarUrl: string | null };
  business: { id: string; slug: string; name: string; onboardingStep: number; publishedAt: string | null } | null;
}

/** What a server-side API call needs from the page or endpoint making it. */
export interface ApiContext {
  request: Request;
  locals: App.Locals;
}

/**
 * Tells the API who the visitor is: every call reaches it from this Worker, so
 * its rate limits would otherwise key on our IP. The API only trusts it with the secret.
 */
export function visitorHeaders(request: Request): Record<string, string> {
  const ip = request.headers.get('cf-connecting-ip');
  return ip && PROXY_SECRET ? { 'x-bookpage-client-ip': ip, 'x-bookpage-proxy-secret': PROXY_SECRET } : {};
}

/**
 * Server-side call to the API as the signed-in owner. Clerk owns the session:
 * middleware puts the owner's short-lived Clerk session token on `locals`, and
 * it goes to the API as a Bearer token. Browser cookies never reach the API.
 */
export function apiFetch(path: string, ctx: ApiContext, init: RequestInit = {}): Promise<Response> {
  const { request, locals } = ctx;
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(visitorHeaders(request))) headers.set(name, value);
  if (locals.apiToken) headers.set('authorization', `Bearer ${locals.apiToken}`);
  const userAgent = request.headers.get('user-agent');
  if (userAgent) headers.set('user-agent', userAgent);
  // Dashboard form posts call the API from here; the API's CSRF check needs the browser's origin.
  const origin = request.headers.get('origin');
  if (origin && !headers.has('origin')) headers.set('origin', origin);
  return fetch(`${API_URL}${path}`, { ...init, headers, redirect: 'manual' });
}

/** The signed-in owner, or null when the API doesn't accept the token. */
export async function getMe(ctx: ApiContext): Promise<Me | null> {
  if (!ctx.locals.apiToken) return null;
  const res = await apiFetch('/auth/me', ctx);
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`GET /auth/me failed: ${res.status}`);
  return (await res.json()) as Me;
}
