import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';

/** Headers the API needs from the browser; everything else (host, CF headers…) stays here. */
const FORWARDED = ['accept', 'accept-language', 'content-type', 'origin'];

/**
 * ${APP_ORIGIN}/api/* → API /*. Keeping the API behind the owner app's origin
 * means the session cookie is host-only on the app host and no CORS is needed.
 * Redirects and Set-Cookie headers pass through untouched.
 */
export const ALL: APIRoute = async ({ request, url }) => {
  // params.path is empty after the middleware rewrite, so derive it from the URL.
  const path = url.pathname.replace(/^(\/app)?\/api(?=\/|$)/, '') || '/';

  const headers = new Headers();
  for (const name of FORWARDED) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.arrayBuffer();
  const upstream = await apiFetch(`${path}${url.search}`, request, init);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
};
