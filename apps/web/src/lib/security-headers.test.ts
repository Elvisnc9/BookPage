import { describe, expect, it } from 'vitest';
import { withSecurityHeaders } from './security-headers';

describe('security headers', () => {
  it('adds the headers to every response, keeping ones the response already set', () => {
    const image = new Response('x', { headers: { 'content-security-policy': "default-src 'none'; sandbox" } });
    const out = withSecurityHeaders(image, new URL('https://glow.example.org/media/1'));
    expect(out.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
    expect(out.headers.get('x-frame-options')).toBe('DENY');
    expect(out.headers.get('x-content-type-options')).toBe('nosniff');
    expect(out.headers.get('strict-transport-security')).toContain('max-age=');
  });

  it('works on redirects (read-only headers) and keeps status, location and cookies', () => {
    const redirect = Response.redirect('https://app.example.org/sign-in', 303);
    const out = withSecurityHeaders(redirect, new URL('https://app.example.org/'));
    expect(out.status).toBe(303);
    expect(out.headers.get('location')).toBe('https://app.example.org/sign-in');
    expect(out.headers.get('content-security-policy')).toBe("frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests");
  });

  it('skips https-only headers on plain http (local development)', () => {
    const out = withSecurityHeaders(new Response('ok'), new URL('http://localhost:4321/'));
    expect(out.headers.get('strict-transport-security')).toBeNull();
    expect(out.headers.get('content-security-policy')).not.toContain('upgrade-insecure-requests');
  });
});
