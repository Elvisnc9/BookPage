/** Subdomains a business can never claim. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'www', 'app', 'api', 'admin', 'dashboard', 'auth', 'login', 'signup',
  'mail', 'email', 'help', 'support', 'docs', 'blog', 'status', 'static',
  'assets', 'cdn', 'img', 'site', 'pricing', 'about', 'privacy', 'terms', 'bookpage',
]);

/** 3–40 chars, lowercase letters, digits and single hyphens, no leading/trailing hyphen. */
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,39}$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}
