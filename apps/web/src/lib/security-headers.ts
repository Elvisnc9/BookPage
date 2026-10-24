/**
 * Security headers on every response (pages, redirects, API proxy, images).
 * A header a response already carries wins: uploaded images keep their own
 * sandboxing Content-Security-Policy from the API.
 *
 * The policy restricts framing, plugins and <base>, not scripts: the owner app
 * loads Clerk's script, and a script allow-list belongs with a tested CSP rollout.
 */
const ALWAYS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  // Nothing of ours is meant to be framed; this blocks clickjacking.
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  // Popups (e.g. a sign-in provider) still work; other sites can't script our windows.
  'cross-origin-opener-policy': 'same-origin-allow-popups',
};

export function securityHeaders(url: URL): Record<string, string> {
  const https = url.protocol === 'https:';
  return {
    ...ALWAYS,
    'content-security-policy': `frame-ancestors 'none'; base-uri 'self'; object-src 'none'${https ? '; upgrade-insecure-requests' : ''}`,
    // Browsers only honour this over https; every host of ours is https in production.
    ...(https ? { 'strict-transport-security': 'max-age=15552000; includeSubDomains' } : {}),
  };
}

export function withSecurityHeaders(res: Response, url: URL): Response {
  // Redirects and fetched responses can have read-only headers: copy first.
  const out = new Response(res.body, res);
  for (const [name, value] of Object.entries(securityHeaders(url))) {
    if (!out.headers.has(name)) out.headers.set(name, value);
  }
  return out;
}
