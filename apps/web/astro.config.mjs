// @ts-check
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';

export default defineConfig({
  output: 'server',
  // Preact islands for the owner app only; booking pages ship (almost) no JS.
  integrations: [preact()],
  // Images are optimised at build time only; uploads get resized by the API.
  adapter: cloudflare({ imageService: 'compile' }),
  // Auth lives in the API's session cookie; Astro sessions (and their KV binding) aren't used.
  session: false,
  // *.localhost resolves to 127.0.0.1: localhost:4321 = owner app, www.localhost:4321 = marketing,
  // glowstudio.localhost:4321 = a booking page.
  server: { port: 4321, host: true },
  vite: {
    server: { allowedHosts: ['.localhost'] },
    // Bundle browser deps up front so the first visit to onboarding or the home page
    // doesn't trigger a mid-session re-optimise and reload in dev.
    optimizeDeps: {
      include: ['preact', 'preact/hooks', 'preact/jsx-runtime', 'preact/devtools', 'gsap', 'gsap/ScrollTrigger', 'lenis'],
    },
  },
  env: {
    schema: {
      ROOT_DOMAIN: envField.string({ context: 'server', access: 'public', default: 'localhost' }),
      // Owner app host. Plain localhost in dev because Google OAuth rejects *.localhost redirect URIs.
      APP_HOST: envField.string({ context: 'server', access: 'public', default: 'localhost' }),
      API_URL: envField.string({ context: 'server', access: 'public', default: 'http://localhost:3000' }),
      // Shared with the API so it trusts the visitor IP we forward (its rate limits key on it).
      PROXY_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
