import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

// `base: '/'` — the app is deployed standalone at a subdomain root and asset
// URLs are absolute there. Assets used by the app are still imported through
// the bundler (rather than referenced as absolute URLs) so a future embed
// under a subpath stays possible. See PRD §19 / project-structure.md.
export default defineConfig({
  base: '/',
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
