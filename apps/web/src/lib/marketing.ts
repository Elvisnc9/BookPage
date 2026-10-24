import type { SiteTemplate } from '@bookpage/shared';
import { API_URL, APP_HOST, ROOT_DOMAIN } from 'astro:env/server';
import { visitorHeaders } from './api';

/** The marketing site for this environment: https://{ROOT_DOMAIN}, or www.localhost in dev. */
export function marketingOrigin(url: URL): string {
  const host = ROOT_DOMAIN === 'localhost' ? 'www.localhost' : ROOT_DOMAIN;
  return `${url.protocol}//${host}${url.port ? `:${url.port}` : ''}`;
}

/** Links from the marketing site to the owner app and the demo booking page, for this environment. */
export function siteLinks(url: URL) {
  const port = url.port ? `:${url.port}` : '';
  const app = `${url.protocol}//${APP_HOST}${port}`;
  return {
    home: marketingOrigin(url),
    signUp: `${app}/sign-in?new`,
    signIn: `${app}/sign-in`,
    dashboard: `${app}/`,
    example: `${url.protocol}//glowstudio.${ROOT_DOMAIN}${port}`,
    rootDomain: ROOT_DOMAIN,
  };
}

export async function joinWaitlist(email: string, request: Request): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(`${API_URL}/marketing/waitlist`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...visitorHeaders(request) },
    body: JSON.stringify({ email, kind: 'pro' }),
  });
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as { message?: string; issues?: { message: string }[] };
  return { ok: false, message: res.status === 429 ? 'Too many attempts, try again in a minute.' : body.issues?.[0]?.message ?? 'Enter a valid email' };
}

export async function slugAvailable(slug: string, request: Request): Promise<{ available: boolean; valid: boolean }> {
  const res = await fetch(`${API_URL}/marketing/slug-available?slug=${encodeURIComponent(slug)}`, { headers: visitorHeaders(request) });
  if (!res.ok) return { available: false, valid: false };
  return (await res.json()) as { available: boolean; valid: boolean };
}

/** The live template catalogue for the showcase. Empty if the API can't be reached (the section then hides). */
export async function listTemplates(request: Request): Promise<SiteTemplate[]> {
  try {
    const res = await fetch(`${API_URL}/marketing/templates`, { headers: visitorHeaders(request) });
    if (!res.ok) return [];
    return ((await res.json()) as { templates: SiteTemplate[] }).templates;
  } catch {
    return [];
  }
}

export interface LiveStats {
  businesses: number;
  bookings: number;
}

/** Real totals for the "Road to 1,000" board, or null if the API can't be reached (the board then shows goals only). */
export async function getStats(request: Request): Promise<LiveStats | null> {
  try {
    const res = await fetch(`${API_URL}/marketing/stats`, { headers: visitorHeaders(request) });
    if (!res.ok) return null;
    return (await res.json()) as LiveStats;
  } catch {
    return null;
  }
}
