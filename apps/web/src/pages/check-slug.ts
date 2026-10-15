import type { APIRoute } from 'astro';
import { slugAvailable } from '../lib/marketing';

/** Marketing "your own link" box: is {slug}.bookpage.app free? */
export const GET: APIRoute = async ({ url, request }) => {
  const slug = (url.searchParams.get('slug') ?? '').trim().toLowerCase().slice(0, 40);
  const result = slug ? await slugAvailable(slug, request) : { available: false, valid: false };
  return new Response(JSON.stringify({ slug, ...result }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
