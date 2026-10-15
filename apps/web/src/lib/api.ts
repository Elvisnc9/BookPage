import { API_URL, PROXY_SECRET } from 'astro:env/server';

export interface Me {
  user: { id: string; email: string; name: string | null; avatarUrl: string | null };
  business: { id: string; slug: string; name: string; onboardingStep: number; publishedAt: string | null } | null;
}

/**
 * Tells the API who the visitor is: every call reaches it from this Worker, so
 * its rate limits would otherwise key on our IP. The API only trusts it with the secret.
 */
export function visitorHeaders(request: Request): Record<string, string> {
  const ip = request.headers.get('cf-connecting-ip');
  return ip && PROXY_SECRET ? { 'x-bookpage-client-ip': ip, 'x-bookpage-proxy-secret': PROXY_SECRET } : {};
}

/** Server-side call to the API on behalf of the browser, carrying its cookies. */
export function apiFetch(path: string, request: Request, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(visitorHeaders(request))) headers.set(name, value);
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const userAgent = request.headers.get('user-agent');
  if (userAgent) headers.set('user-agent', userAgent);
  return fetch(`${API_URL}${path}`, { ...init, headers, redirect: 'manual' });
}

/** The signed-in owner, or null. Also returns any refreshed session cookie to pass on. */
export async function getMe(request: Request): Promise<{ me: Me | null; setCookies: string[] }> {
  if (!request.headers.get('cookie')) return { me: null, setCookies: [] };
  const res = await apiFetch('/auth/me', request);
  const setCookies = res.headers.getSetCookie();
  if (res.status === 401) return { me: null, setCookies };
  if (!res.ok) throw new Error(`GET /auth/me failed: ${res.status}`);
  return { me: (await res.json()) as Me, setCookies };
}
