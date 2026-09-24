# Truss Calibrator web app

Guided web app for the Truss filament-shrinkage calibration. Users print a calibration
beam, enter caliper measurements, and receive a full-precision-derived XY shrinkage value
plus the percentage to enter in their slicer.

Built with Solid.js + Vite. See [`../ai-context/PRD.md`](../ai-context/PRD.md) for the
product requirements and [`../ai-context/implementation-plan.md`](../ai-context/implementation-plan.md)
for the delivery checklist.

## Requirements

- Node.js 24+ (tests use Node's built-in `node:test` with TypeScript type stripping)
- pnpm (npm/yarn work too)

## Commands

```bash
pnpm install
pnpm dev       # dev server
pnpm build     # type-check + production build to dist/
pnpm preview   # serve the production build
pnpm test      # math, validation, import/export, and persistence tests
```

`pnpm build` and `pnpm test` are the automated gates. The test suite intentionally does
not depend on rounding stored factors; display rounding lives only in `formatShrinkage`
and `formatPercent`.

## Architecture

- `src/App.tsx` owns all durable state (saved printers, skip-equipment preference, active
  flow/step, draft measurements/checkboxes) and persistence. Screens receive an `AppApi`
  and keep only transient local state (modals, form fields).
- `src/lib/` holds pure logic: `calc.ts` (math/validation/formatting), `printers.ts`
  (profiles + JSON import/export), `storage.ts` (browser storage with an injectable
  surface for tests), `flow.ts` (step order), `assets.ts` (bundled asset URLs).
- `src/pages/` holds the home, printer-management, and the Quad/Single step screens.
- `src/components/` holds the few shared pieces (flow chrome, number field, measurement
  fields, dialogs, guide fragments).
- `src/styles/global.css` is the provided global stylesheet; `src/local.css` holds only
  `truss-`-prefixed app styles. There is no CSS reset and no path-based router.

## Standalone deployment

`pnpm build` produces `dist/`. The Vite `base` is `./`, so `dist/` can be served from any
nested URL (for example `https://example.com/tools/truss/`). Assets and STL downloads are
resolved through Vite URL imports and `import.meta.url`, never from the site root.

## Embedding in a host page (for example an Astro island)

Import the Solid component and render it yourself; do not rely on `window.location`:

```tsx
import App from './truss-webui/src/App.tsx'

// e.g. inside a host framework's mount point
render(() => <App />, hostElement)
```

Requirements:

- The host must load `src/styles/global.css` (the provided global stylesheet) for
  consistent typography, forms, and buttons. App-specific styles are already bundled from
  `src/local.css` and are all `truss-`-prefixed, so they will not collide with host CSS.
- No path-based routing is used, and the app never reads or writes the URL.
- Assets (images and the Quad/Single STLs) are bundled by Vite, so the host's URL path and
  root-relative asset assumptions do not matter.

The app can also be mounted by serving the built standalone bundle at a nested path with a
host page that provides a `#root` element and the host stylesheet.

## Data and storage

- All user data stays in the browser's `localStorage` (key `truss-calibrator-v1`). There
  is no account, backend, analytics, or network transmission of printer or measurement
  data.
- Saved printers, the equipment-prerequisite skip preference, and the active calibration
  are persisted. An unfinished calibration resumes automatically on reload; Exit or Finish
  clears only the active calibration.
- If storage is unavailable or a write fails, the app still works in memory and warns that
  progress and profiles may not survive a refresh. When a Quad profile cannot be saved, the
  result screen shows the full-precision factor and asks the user to note it down manually.
- Standalone and embedded deployments may have separate storage origins; transfer profiles
  with Export/Import.

## Import/export

Export writes `{ "version": 1, "printers": [ { "name", "extrapolationFactor" } ] }`.
Import validates the whole file before changing anything: it must be JSON with a supported
version, a list of profiles with unique non-empty names and finite positive numeric
factors. Invalid files are rejected entirely. Names already saved locally are kept; the
skipped names and count are reported. Import/export covers printer profiles only, not the
active calibration or the skip preference.

## Browser support

Targets current Chrome, Firefox, Safari, and Edge, including mobile Chrome and Safari. The
layout is responsive from phone through desktop. The app aims for WCAG 2.2 AA: labelled
inputs and units, associated blocking errors and live non-blocking warnings, alt text on
images, keyboard-operable navigation and dialogs, visible focus, and native `<dialog>`
focus trapping/return.

## Manual verification still required

Automated tests cover the formulas, input validation and warning boundaries, JSON
import/export, and persistence/resume/clear behavior. These were not run in a real browser
in the implementation environment and should be confirmed before release:

- Full Quad flow (fresh save, same-name overwrite with cancel/confirm), Single flow with a
  saved and an imported printer, no-printer guard, Exit/Finish, and refresh/reopen resume.
- Responsive behavior and accessibility (keyboard-only and screen reader) on desktop and
  mobile browsers.
- Both delivery modes: standalone at a nested URL and embedded (e.g. Astro) with the host
  stylesheet.
