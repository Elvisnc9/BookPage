// @ts-check
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';

/**
 * Clerk's Astro components import one virtual module that its integration normally
 * provides. We don't use that integration: it would add Clerk's browser script to
 * every page, including the no-JS booking pages. This supplies just that module;
 * Clerk is started only on owner-app pages (components/ClerkScript.astro).
 * @returns {any} A Vite plugin.
 */
function clerkConfigModule() {
  const id = 'virtual:@clerk/astro/config';
  return {
    name: 'bookpage-clerk-config',
    /** @param {string} source */
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    /** @param {string} source */
    load: (source) =>
      source === `\0${id}`
        ? `export function isStaticOutput(forceStatic) { return forceStatic !== undefined ? forceStatic : false; }`
        : undefined,
  };
}

export default defineConfig({
  output: 'server',
  // Preact islands for the owner app only; booking pages ship (almost) no JS.
  integrations: [preact()],
  // Images are optimised at build time only; uploads get resized by the API.
  adapter: cloudflare({ imageService: 'compile' }),
  // Clerk owns owner sessions; Astro sessions (and their KV binding) aren't used.
  session: false,
  // *.localhost resolves to 127.0.0.1: localhost:4321 = owner app, www.localhost:4321 = marketing,
  // glowstudio.localhost:4321 = a booking page.
  server: { port: 4321, host: true },
  vite: {
    plugins: [clerkConfigModule()],
    // .nip.io: phone testing over Wi-Fi (see domainsFor in src/lib/host.ts).
    server: { allowedHosts: ['.localhost', '.nip.io'] },
    // Bundle browser deps up front so the first visit to onboarding or the home page
    // doesn't trigger a mid-session re-optimise and reload in dev.
    optimizeDeps: {
      include: ['preact', 'preact/hooks', 'preact/compat', 'preact/jsx-runtime', 'preact/devtools', 'gsap', 'gsap/ScrollTrigger', 'lenis', '@clerk/astro/internal'],
    },
    // Same for server rendering: the marketing showcase and the booking pages render
    // Preact on the server, and discovering it mid-session left a stale dep cache.
    ssr: {
      optimizeDeps: { include: ['preact', 'preact/hooks', 'preact/compat', 'preact/jsx-runtime'] },
      // Clerk's server code asks for Node's async_hooks (provided by nodejs_compat on Workers).
      external: ['node:async_hooks'],
    },
    build: { rollupOptions: { external: ['cloudflare:workers'] } },
  },
  env: {
    schema: {
      ROOT_DOMAIN: envField.string({ context: 'server', access: 'public', default: 'localhost' }),
      // Owner app host. Plain localhost in dev (*.localhost hosts are the booking pages).
      APP_HOST: envField.string({ context: 'server', access: 'public', default: 'localhost' }),
      API_URL: envField.string({ context: 'server', access: 'public', default: 'http://localhost:3000' }),
      // Shared with the API so it trusts the visitor IP we forward (its rate limits key on it).
      PROXY_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Clerk keys (owner sign-in). Read by Clerk itself; declared here so a missing key fails fast.
      PUBLIC_CLERK_PUBLISHABLE_KEY: envField.string({ context: 'client', access: 'public' }),
      CLERK_SECRET_KEY: envField.string({ context: 'server', access: 'secret' }),
    },
  },
});
