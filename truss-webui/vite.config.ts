import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  // Relative base so the built standalone app works from a nested URL and its
  // emitted asset URLs never assume the site root.
  base: './',
  plugins: [solid()],
})
