# Truss Shrinkage Calibrator Webapp

A guided webapp for calibrating 3D-printer filament XY shrinkage with the
3D-printed Truss calibrator. It walks the user through either a full Quad-beam
calibration or a rapid Single-beam repeat calibration, performs all the
arithmetic, and produces the value to enter into the slicer. See
`../ai-context/PRD.md` for the full specification.

Built with SolidJS + Vite + TypeScript. No router, no backend, no runtime
network calls by the app itself.

## Commands

```bash
pnpm install      # install dependencies
pnpm dev          # start the dev server
pnpm build        # type-check and produce a production build in dist/
pnpm preview      # serve the production build locally
pnpm test         # run the Vitest suite once
pnpm test:watch   # run Vitest in watch mode
pnpm lint         # Biome check
pnpm format       # Biome format --write
```

## Deployment

Static build deployed at the **root of a subdomain** (`/`), so Vite `base` is
`/`. Assets (STLs, images) are imported through the bundler, so the app can be
embedded under a subpath later without rewriting asset URLs. There is no
path-based routing: a page refresh always returns to the Home screen, which
also keeps the app embeddable as an Astro island.

`src/styles/global.css` is the shared parent-site stylesheet and is loaded by
the standalone build too; project-only styles live in `src/styles/local.css`
with every selector prefixed `truss-`.

**Known deviation:** `global.css` `@import`s two web fonts from a CDN
(Pretendard, Chivo Mono). That is inherent to the shared stylesheet, not the
app; without network access the app falls back to system fonts and remains
fully functional. App code makes no runtime network requests.

## Data & persistence

All state is client-side (`localStorage`). No network requests.

| Key | Shape |
|---|---|
| `truss-calibrator.printers.v1` | `{ "version": 1, "printers": [{ "name": string, "extrapolationFactor": number }] }` |
| `truss-calibrator.prefs.v1` | `{ "skipPrerequisiteCheck": boolean }` |

- Printer names are unique case-insensitively; stored casing is preserved.
- Extrapolation factors are stored at full precision and rounded only for
  display (5 dp for ratios/factors, 4 dp for the final shrinkage value).
- Corrupt stored data is treated as empty for the session but is **never
  deleted**; recovery is via export/import.
- If `localStorage` is unavailable the app runs in memory and shows a warning.

### Export / import format

```jsonc
{ "version": 1, "printers": [ { "name": "Bambu P1S", "extrapolationFactor": 1.02345 } ] }
```

Export downloads `truss-printers-YYYYMMDD-HHmmss.json`. Import merges
per-printer, keeps existing entries on case-insensitive name conflicts, skips
invalid entries, and rejects unknown versions or malformed files without
changing anything.

## Layout

```
src/
  App.tsx              root component + all durable state
  components/          FlowLayout + shared UI primitives
  lib/                 types, constants, storage, calculations, validation, assets
  pages/               Home, ManagePrinters, quad/Q1..Q9, single/S1..S6
  styles/              global.css (shared) + local.css (truss-* only)
```

## Release

v1 — implemented against `ai-context/PRD.md` and
`ai-context/implementation-plan.md`. All 42 plan tasks complete. Tag the
current commit as `v1` once these changes are committed.
