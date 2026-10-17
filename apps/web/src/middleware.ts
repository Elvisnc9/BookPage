import { defineMiddleware } from 'astro:middleware';
import { APP_HOST, ROOT_DOMAIN } from 'astro:env/server';
import { isValidSlug } from '@bookpage/shared';
import { getMe } from './lib/api';
import { isInternalPath, resolveSite } from './lib/host';

const notFound = () => new Response('Not found', { status: 404 });

/** Owner-app paths reachable without a session. */
const PUBLIC_APP_PATHS = new Set(['/sign-in']);

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
      break;
  }

  // Owner app. /api/* is proxied straight to the API, which checks the session itself.
  if (pathname === '/api' || pathname.startsWith('/api/')) return next(`/app${pathname}${search}`);

  const { me, setCookies } = await getMe(context.request);
  const isPublic = PUBLIC_APP_PATHS.has(pathname);

  let response: Response;
  if (!me && !isPublic) {
    response = context.redirect('/sign-in', 303);
  } else if (me && isPublic) {
    response = context.redirect('/', 303);
  } else if (me && !me.business?.publishedAt && pathname !== '/onboarding') {
    // The dashboard needs a live page; finish onboarding first.
    response = context.redirect('/onboarding', 303);
  } else {
    if (me) context.locals.me = me;
    response = await next(`/app${rest}${search}`);
  }

  // A sliding session renewal comes back from /auth/me; hand it to the browser.
  if (setCookies.length) {
    response = new Response(response.body, response);
    for (const cookie of setCookies) response.headers.append('set-cookie', cookie);
  }
  return response;
});
