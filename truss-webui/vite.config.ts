import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

const elementEntry = fileURLToPath(new URL('./src/element/truss-calibrator.tsx', import.meta.url))

export default defineConfig(({ mode }) => ({
  plugins: [
    solid({
      solid: {
        /**
         * Event delegation is **off**, and this is required for the widget to work
         * at all (PRD §6.2).
         *
         * Solid's default is to register one listener per event name on `document`
         * and then find the handler by reading `event.target`. That relies on
         * `event.target` being the element that was clicked. Across a shadow
         * boundary it is not: for a listener outside the shadow tree the browser
         * *retargets* `event.target` to the host element, so Solid walks up from
         * `<truss-calibrator>` and never finds the button's handler. Every control
         * in the widget — including `input` and `change` — would be inert when
         * embedded, while the jsdom test suite stayed green, because jsdom's
         * retargeting does not change `event.target` for document-level listeners.
         *
         * Turning delegation off makes Solid attach real listeners to the elements,
         * which is what a shadow-scoped widget needs. The cost is one listener per
         * handler instead of one per event name — irrelevant at this size.
         */
        delegateEvents: false,
      },
    }),
  ],
  /**
   * A **relative** base is load-bearing, not cosmetic (PRD §6.3, decision 11).
   * With the default absolute base, Vite rewrites asset references to
   * `/assets/…`, which resolves against the *host page's* origin — so the widget
   * would load its own assets only when mounted at the site root, and would 404
   * under any sub-path. Verified by `src/assets/urls.build.test.ts`.
   */
  base: './',
  // `.stl` is not one of Vite's known asset types, so the download files would
  // otherwise be left out of the bundle as unresolved paths.
  assetsInclude: ['**/*.stl'],
  // Solid ships development *and* browser conditional exports; without the
  // development condition the test runner would exercise the production build,
  // which hides the warnings a test suite exists to catch.
  resolve: {
    conditions: mode === 'test' ? ['development', 'browser'] : [],
  },
  build: {
    // Nothing is inlined as a data URI: an inlined STL would bloat the bundle
    // and lose its filename, and the whole point of the asset pipeline is that
    // the models are delivered as real, downloadable files.
    assetsInlineLimit: 0,
    /**
     * The shipped entry is the **element**, not the harness page.
     *
     * `build.lib` is deliberately not used: Vite's asset plugin returns `true`
     * from `shouldInline()` whenever `config.build.lib` is set, so library mode
     * inlines *every* asset as a data URI and ignores `assetsInlineLimit`. That
     * would base64 the STLs into the entry chunk and turn the download button
     * into a `data:` URL. A plain rollup input gets the same single-file output
     * with real asset files beside it (verified in src/assets/urls.build.test.ts).
     *
     * No CSS file is emitted either — the app's stylesheets are imported with
     * `?inline` and adopted inside the shadow root (T13), where a host page's
     * `<link>` could never reach them anyway.
     */
    rollupOptions: {
      input: { 'truss-calibrator': elementEntry },
      output: {
        format: 'es',
        // A stable, unhashed name: the host page hard-codes this one script tag.
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: {
    environment: 'jsdom',
    /**
     * Vitest stubs CSS out by default, which makes `import css from './x.css?inline'`
     * resolve to an empty string. The app's styling is a functional requirement
     * (PRD §6.2, §6.4) and the shadow-root stylesheet is only verifiable if the
     * real text is present, so CSS is processed in tests.
     */
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test-setup.ts', 'src/index.tsx'],
      thresholds: {
        statements: 85,
        lines: 85,
        functions: 85,
        branches: 75,
      },
    },
  },
}))
