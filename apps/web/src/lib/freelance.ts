// Elvis's freelance custom-design service, offered next to the templates in
// onboarding and on the marketing page. One place to change the link.
//
// PLACEHOLDER: replace FREELANCE_URL with the real booking / contact link.
// While it's the placeholder, cards still render (so the design can be
// reviewed) but the link goes nowhere useful.
export const FREELANCE_URL = 'https://example.com/REPLACE-WITH-ELVIS-BOOKING-LINK';
export const FREELANCE_IS_PLACEHOLDER = FREELANCE_URL.includes('REPLACE-WITH');

export const FREELANCE_COPY = {
  title: "Need a look that's all yours?",
  body: 'Talk to Elvis: custom design for your page. A one-off look built around your brand, on the same booking system.',
  action: 'Talk to Elvis',
} as const;
