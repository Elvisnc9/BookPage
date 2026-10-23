import { defineMiddleware } from 'astro:middleware';
import type { APIContext, MiddlewareNext } from 'astro';
import { APP_HOST, ROOT_DOMAIN } from 'astro:env/server';
import { clerkMiddleware } from '@clerk/astro/server';
import { isValidSlug } from '@bookpage/shared';
import { getMe } from './lib/api';
import { isInternalPath, resolveSite } from './lib/host';

const notFound = () => new Response('Not found', { status: 404 });

/** Owner-app paths reachable without being signed in. */
const PUBLIC_APP_PATHS = new Set(['/sign-in']);

/**
 * Clerk runs for the owner app only: it reads and refreshes its own session
 * cookies and adds `locals.auth()`. Marketing and booking pages never touch it,
 * so customers' browsers load no Clerk script and set no Clerk cookies.
 */
const withClerk = clerkMiddleware();

// next(path) rewrites without running this middleware a second time.
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search } = context.url;

  // Dashboard panels stream in as server islands; they call the API, so on the owner
  // app they need the signed-in owner's token like any page (no rewrite, though).
  if (pathname.startsWith('/_server-islands/') && resolveSite(context.url.hostname, ROOT_DOMAIN, APP_HOST).kind === 'app') {
    return (await withClerk(context, () => islandAuth(context, next))) ?? notFound();
  }
  // /_astro, /_image etc. are framework internals.
  if (pathname.startsWith('/_')) return next();
  // Uploaded images are public and served the same on every host.
  if (pathname.startsWith('/media/')) return next();

  const site = resolveSite(context.url.hostname, ROOT_DOMAIN, APP_HOST);
  const rest = pathname === '/' ? '' : pathname;

  switch (site.kind) {
    case 'marketing':
      return isInternalPath(pathname) ? notFound() : next();
    case 'booking':
      if (!isValidSlug(site.slug)) return notFound();
      // Endpoints (not pages) get empty params after a rewrite, so pass the slug along.
      context.locals.slug = site.slug;
      return next(`/site/${site.slug}${rest}${search}`);
    case 'unknown':
      return notFound();
    case 'app':
      // Clerk's handler is typed as possibly returning nothing; ours always returns a response.
      return (await withClerk(context, () => ownerApp(context, next, pathname, rest, search))) ?? notFound();
  }
});

async function islandAuth(context: APIContext, next: MiddlewareNext): Promise<Response> {
  const auth = context.locals.auth();
  if (!auth.userId) return new Response('Unauthorized', { status: 401 });
  context.locals.apiToken = await auth.getToken();
  return next();
}

async function ownerApp(context: APIContext, next: MiddlewareNext, pathname: string, rest: string, search: string): Promise<Response> {
  const auth = context.locals.auth();
  // The owner's Clerk session token (about a minute long) for this request's API calls.
  context.locals.apiToken = auth.userId ? await auth.getToken() : null;

  // /api/* is proxied straight to the API, which checks the token itself.
  if (pathname === '/api' || pathname.startsWith('/api/')) return next(`/app${pathname}${search}`);

  const isPublic = PUBLIC_APP_PATHS.has(pathname);
  if (!auth.userId) {
    return ownerPage(isPublic ? await next(`/app${rest}${search}`) : context.redirect('/sign-in', 303), context, null);
  }

  const me = await getMe(context);
  // Signed in to Clerk but the API refused the account (e.g. unverified email): explain on the sign-in page.
  if (!me) return ownerPage(isPublic ? await next(`/app${rest}${search}`) : context.redirect('/sign-in?error=account', 303), context, null);
  const name = me.user.name?.split(' ')[0] || me.user.email.split('@')[0] || 'Dashboard';
  if (isPublic) return ownerPage(context.redirect('/', 303), context, name);
  // The dashboard needs a live page; finish onboarding first.
  if (!me.business?.publishedAt && pathname !== '/onboarding') return ownerPage(context.redirect('/onboarding', 303), context, name);

  context.locals.me = me;
  return ownerPage(await next(`/app${rest}${search}`), context, name);
}

/** A small, non-secret hint shared with the marketing site: who's signed in, for its header. */
export const OWNER_HINT_COOKIE = 'bp_owner';

/**
 * Every owner-app page and redirect: never cached, so the Back button asks the
 * server again (and gets redirected) instead of showing a stale sign-in page,
 * or a dashboard after signing out. Also sets or clears the owner hint.
 */
function ownerPage(res: Response, context: APIContext, ownerName: string | null): Response {
  const out = new Response(res.body, res);
  out.headers.set('cache-control', 'no-store');
  const has = context.cookies.get(OWNER_HINT_COOKIE)?.value;
  const value = ownerName ? encodeURIComponent(ownerName.slice(0, 30)) : '';
  if (value !== (has ?? '')) {
    // Shared with every subdomain, so www. (marketing) can read it. In dev that's *.localhost.
    const domain = `; Domain=${ROOT_DOMAIN}`;
    const secure = context.url.protocol === 'https:' ? '; Secure' : '';
    const life = value ? `; Max-Age=${60 * 60 * 24 * 30}` : '; Max-Age=0';
    out.headers.append('set-cookie', `${OWNER_HINT_COOKIE}=${value}; Path=/; SameSite=Lax; HttpOnly${secure}${domain}${life}`);
  }
  return out;
}
