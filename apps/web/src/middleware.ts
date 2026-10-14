import { defineMiddleware } from 'astro:middleware';
import { ROOT_DOMAIN } from 'astro:env/server';
import { isValidSlug } from '@bookpage/shared';
import { isInternalPath, resolveSite } from './lib/host';

const notFound = () => new Response('Not found', { status: 404 });

// next(path) rewrites without running this middleware a second time.
export const onRequest = defineMiddleware((context, next) => {
  const { pathname, search } = context.url;

  // /_astro, /_image, /_server-islands etc. are framework internals.
  if (pathname.startsWith('/_')) return next();

  const site = resolveSite(context.url.hostname, ROOT_DOMAIN);
  const rest = pathname === '/' ? '' : pathname;

  switch (site.kind) {
    case 'marketing':
      return isInternalPath(pathname) ? notFound() : next();
    case 'app':
      return next(`/app${rest}${search}`);
    case 'booking':
      return isValidSlug(site.slug) ? next(`/site/${site.slug}${rest}${search}`) : notFound();
    case 'unknown':
      return notFound();
  }
});
