import type { APIRoute } from 'astro';
import { API_URL } from 'astro:env/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Uploaded images, on every host (booking pages and the owner app), so pages
 * reference them as same-origin /media/{id}. Ids are never reused, so the API
 * marks them immutable and Cloudflare can cache them at the edge.
 */
export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? '';
  if (!UUID.test(id)) return new Response('Not found', { status: 404 });
  const upstream = await fetch(`${API_URL}/media/${id}`);
  if (!upstream.ok) return new Response('Not found', { status: upstream.status === 404 ? 404 : 502 });

  const headers = new Headers();
  for (const name of ['content-type', 'content-length', 'cache-control', 'x-content-type-options', 'content-security-policy']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: 200, headers });
};
