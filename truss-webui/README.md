# Truss Shrinkage Calibrator — Web UI

A tiny SolidJS + Vite + TypeScript app that guides you through the Truss
calibrator flow and performs all shrinkage math automatically. It runs
standalone and is designed to remain embeddable (no router, scoped CSS,
base-path-safe assets).

- Product requirements: `../ai-context/PRD.md`
- Implementation plan: `../ai-context/implementation-plan.md`
- Source calibration docs: `../Documentation/*`

## Prerequisites

- Node.js 20+
- pnpm (the lockfile is `pnpm-lock.yaml`)

## Commands

```bash
pnpm install       # install dependencies
pnpm dev           # dev server at http://localhost:5173
pnpm build         # type-check + production build to dist/
pnpm preview       # preview the production build
pnpm test          # run the Vitest suite once
pnpm test:watch    # run Vitest in watch mode
pnpm lint          # Biome check
pnpm format        # Biome format
```

## Deployment

Produced with `base: '/'` (PRD §19) for a static host at a subdomain root.
Refresh always returns to the Home screen because the app has no path-based
router. The build is a single bundle and all images/STLs are emitted under
`dist/assets/`, so embedding under a subpath later only requires changing
`base`.

## Persistence

All state is client-side; there are no runtime network calls.

| localStorage key | Contents |
| --- | --- |
| `truss-calibrator.printers.v1` | `{ version: 1, printers: [{ name, extrapolationFactor }] }` |
| `truss-calibrator.prefs.v1` | `{ skipPrerequisiteCheck: boolean }` |

Exported backups use the same `{ version: 1, printers: [...] }` shape and a
timestamped filename: `truss-printers-YYYYMMDD-HHmmss.json`.

Corrupt stored data is never deleted; the app falls back to an empty list for
the session and shows a notice. If localStorage is unavailable the app runs in
memory and warns that saves will not persist.

## Project layout

```
src/
  App.tsx                # root state + screen switch (no router)
  lib/                   # types, constants, storage, calc, validation, assets
  components/ui/         # small shared primitives (Button, Modal, ...)
  pages/                 # Home, ManagePrinters, quad/, single/
  styles/global.css      # parent-site stylesheet (shared)
  styles/local.css       # project styles, all `truss-` prefixed
```

## Note on fonts

`global.css` is the stylesheet shared with the parent website and contains
external `@import`s for the Pretendard and Chivo Mono web fonts. Those imports
are the only runtime network requests the build can make; the app itself works
fully offline without them (fallback fonts apply).
