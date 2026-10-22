/**
 * Who runs BookPage, for the privacy notice and terms. FILL THESE IN before
 * launch: GDPR requires the notice to name the controller and a contact.
 * Pages show `[ … ]` placeholders until they're set, so a missing value is visible.
 */
export const LEGAL = {
  /** The legal name of the person or company running BookPage. */
  operator: '[Your company or full legal name]',
  /** Postal address of the operator (country and city at minimum). */
  address: '[Your business address]',
  /** Where people send privacy requests and questions. Must be a real, monitored inbox. */
  contactEmail: '[privacy contact email]',
  /** Country whose law governs the terms, and whose courts handle disputes. */
  governingLaw: '[country]',
  /** When these texts last changed. */
  updated: '22 October 2026',
};

/** Services that process data on BookPage's behalf. Keep in sync with what's actually deployed. */
export const PROCESSORS = [
  { name: 'Cloudflare', purpose: 'Hosting the website and booking pages', where: 'Global network' },
  { name: 'Neon', purpose: 'Database (business profiles, bookings, customers)', where: 'United States (AWS us-east-2)' },
  { name: 'Resend', purpose: 'Sending booking emails and reminders', where: 'United States' },
  { name: 'Clerk', purpose: 'Owner sign-in, sessions and account security', where: 'United States' },
  { name: '[API host]', purpose: 'Running the BookPage server', where: '[region]' },
];
