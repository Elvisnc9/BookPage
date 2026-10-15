// @ts-check
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  // Images are optimised at build time only; uploads get resized by the API.
  adapter: cloudflare({ imageService: 'compile' }),
  // Auth lives in the API's session cookie; Astro sessions (and their KV binding) aren't used.
  session: false,
  // *.localhost resolves to 127.0.0.1: localhost:4321 = owner app, www.localhost:4321 = marketing,
  // glowstudio.localhost:4321 = a booking page.
  server: { port: 4321, host: true },
  vite: { server: { allowedHosts: ['.localhost'] } },
  env: {
    schema: {
      ROOT_DOMAIN: envField.string({ context: 'server', access: 'public', default: 'localhost' }),
      // Owner app host. Plain localhost in dev because Google OAuth rejects *.localhost redirect URIs.
      APP_HOST: envField.string({ context: 'server', access: 'public', default: 'localhost' }),
      API_URL: envField.string({ context: 'server', access: 'public', default: 'http://localhost:3000' }),
    },
  },
});
