import { describe, expect, it } from 'vitest';
import { isInternalPath, resolveSite } from './host';

describe('resolveSite', () => {
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

  it('works with localhost in dev', () => {
    expect(resolveSite('localhost', 'localhost')).toEqual({ kind: 'marketing' });
    expect(resolveSite('glowstudio.localhost', 'localhost')).toEqual({ kind: 'booking', slug: 'glowstudio' });
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
