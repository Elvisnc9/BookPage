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

  // /_astro, /_image, /_server-islands etc. are framework internals.
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

async function ownerApp(context: APIContext, next: MiddlewareNext, pathname: string, rest: string, search: string): Promise<Response> {
  const auth = context.locals.auth();
  // The owner's Clerk session token (about a minute long) for this request's API calls.
  context.locals.apiToken = auth.userId ? await auth.getToken() : null;

  // /api/* is proxied straight to the API, which checks the token itself.
  if (pathname === '/api' || pathname.startsWith('/api/')) return next(`/app${pathname}${search}`);

  const isPublic = PUBLIC_APP_PATHS.has(pathname);
  if (!auth.userId) return isPublic ? next(`/app${rest}${search}`) : context.redirect('/sign-in', 303);

  const me = await getMe(context);
  // Signed in to Clerk but the API refused the account (e.g. unverified email): explain on the sign-in page.
  if (!me) return isPublic ? next(`/app${rest}${search}`) : context.redirect('/sign-in?error=account', 303);
  if (isPublic) return context.redirect('/', 303);
  // The dashboard needs a live page; finish onboarding first.
  if (!me.business?.publishedAt && pathname !== '/onboarding') return context.redirect('/onboarding', 303);

  context.locals.me = me;
  return next(`/app${rest}${search}`);
}
