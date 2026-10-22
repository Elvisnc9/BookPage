import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';

/** Headers the API needs from the browser; everything else (host, CF headers…) stays here. */
const FORWARDED = ['accept', 'accept-language', 'content-type', 'origin'];

/**
 * ${APP_ORIGIN}/api/* → API /*. The browser's Clerk cookies stay here: middleware
 * turns the session into a short-lived token, which apiFetch sends as a Bearer token.
 * Keeping the API behind the owner app's origin means no CORS is needed.
 */
export const ALL: APIRoute = async (context) => {
  const { request, url } = context;
  // params.path is empty after the middleware rewrite, so derive it from the URL.
  const path = url.pathname.replace(/^(\/app)?\/api(?=\/|$)/, '') || '/';

  const headers = new Headers();
  for (const name of FORWARDED) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.arrayBuffer();
  const upstream = await apiFetch(`${path}${url.search}`, context, init);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
};
