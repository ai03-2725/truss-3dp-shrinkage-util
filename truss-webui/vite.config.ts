/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

// `base: '/'` because the app is deployed standalone at a subdomain root
// (PRD §19). Bundler-imported assets are still preferred so the app can later
// be embedded under a subpath without changing this value.
export default defineConfig({
  base: '/',
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
