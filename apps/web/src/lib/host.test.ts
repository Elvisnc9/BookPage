import { describe, expect, it } from 'vitest';
import { isInternalPath, resolveSite } from './host';

describe('resolveSite in production', () => {
  const root = 'bookpage.app';

  it('maps the apex and www to marketing', () => {
    expect(resolveSite('bookpage.app', root)).toEqual({ kind: 'marketing' });
    expect(resolveSite('www.bookpage.app', root)).toEqual({ kind: 'marketing' });
    expect(resolveSite('BookPage.app.', root)).toEqual({ kind: 'marketing' });
  });

  it('maps app. to the owner app', () => {
    expect(resolveSite('app.bookpage.app', root)).toEqual({ kind: 'app' });
  });

  it('maps any other single label to a booking page', () => {
    expect(resolveSite('glowstudio.bookpage.app', root)).toEqual({ kind: 'booking', slug: 'glowstudio' });
  });

  it('rejects nested subdomains and foreign hosts', () => {
    expect(resolveSite('a.b.bookpage.app', root)).toEqual({ kind: 'unknown' });
    expect(resolveSite('evilbookpage.app', root)).toEqual({ kind: 'unknown' });
    expect(resolveSite('example.com', root)).toEqual({ kind: 'unknown' });
  });
});

describe('resolveSite in dev (app host = localhost)', () => {
  const site = (host: string) => resolveSite(host, 'localhost', 'localhost');

  it('serves the owner app on plain localhost and marketing on www', () => {
    expect(site('localhost')).toEqual({ kind: 'app' });
    expect(site('www.localhost')).toEqual({ kind: 'marketing' });
  });

  it('still serves booking pages on subdomains', () => {
    expect(site('glowstudio.localhost')).toEqual({ kind: 'booking', slug: 'glowstudio' });
  });

  it('does not treat app.localhost as a booking page', () => {
    expect(site('app.localhost')).toEqual({ kind: 'unknown' });
  });
});

describe('isInternalPath', () => {
  it('flags rewrite-only prefixes', () => {
    expect(isInternalPath('/app')).toBe(true);
    expect(isInternalPath('/site/glowstudio')).toBe(true);
    expect(isInternalPath('/apples')).toBe(false);
    expect(isInternalPath('/')).toBe(false);
  });
});
