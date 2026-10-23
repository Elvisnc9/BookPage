import type { APIRoute } from 'astro';
import { getStats } from '../lib/marketing';

/** Live totals for the marketing page's board, polled by the page every few seconds. */
export const GET: APIRoute = async ({ request }) => {
  const stats = await getStats(request);
  return new Response(JSON.stringify(stats ?? {}), {
    status: stats ? 200 : 503,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
