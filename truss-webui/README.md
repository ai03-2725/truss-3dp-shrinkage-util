# truss-webui

The calibration widget: a **zero-config custom element** that measures a printed
calibration truss with calipers and returns the XY shrinkage value to enter in a
slicer. It embeds into the existing Truss Calibrator site; it is not a standalone
app and has no backend, no account, and no network calls.

The product requirements are the authority for everything here:
[`../ai-context/PRD.md`](../ai-context/PRD.md). The task breakdown that produced
this code is [`../ai-context/BUILD-PLAN.md`](../ai-context/BUILD-PLAN.md).

## Toolchain

Pinned versions — the repo is developed and verified against exactly these:

| Tool    | Version                    | How it is pinned                  |
| ------- | -------------------------- | --------------------------------- |
| Node.js | `24.16.0` (any `>=24 <25`) | `.nvmrc` + `engines.node`         |
| pnpm    | `10.5.2` (any `>=10`)      | `packageManager` + `engines.pnpm` |

```bash
$ nvm use          # reads .nvmrc
$ corepack enable  # makes the pinned pnpm available
$ pnpm install
```

`.npmrc` sets `enable-pre-post-scripts=true` because the asset pipeline runs as a
`predev`/`prebuild` hook, and pnpm disables pre/post hooks by default.

## Assets

The repository root owns the assets: the three STL models and
`Documentation/Images`. Nothing under `src/assets/{stl,img}` is committed —
`pnpm assets:sync` regenerates it, and it runs automatically as a `predev`,
`prebuild`, and `pretest` hook.

```bash
$ pnpm assets:sync
assets:sync — 2 STLs copied, 28 images optimised (35.3MB → 4.0MB at 1400px, WebP q82)
```

- **STLs** — the Quad and Single models are copied verbatim. Dual is deliberately
  excluded (out of scope), and a missing source file fails the sync rather than
  producing a build with a dead download button.
- **Images** — the 28 referenced figures are resized to a 1400px long edge and
  re-encoded to WebP at q82. The list lives in `assets.config.json`; an image that
  is not on it does not ship.
- **URLs** — `src/assets/urls.ts` maps names to URLs resolved against the app's own
  script URL. Never reference an asset root-absolutely (`/assets/…`): it would work
  in development and 404 the moment the widget is embedded under a sub-path. A test
  scans the source for that pattern.

## Scripts

| Script                              | What it does                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm dev`                          | Vite dev server for the harness page in `public/index.html`                       |
| `pnpm build`                        | `tsc -b` then `vite build` → `dist/truss-calibrator.js` + `dist/assets/`          |
| `pnpm preview`                      | Serves `dist/` (add `--base=/some/path/` to rehearse a sub-path deploy)           |
| `pnpm test`                         | `vitest run` — the whole suite once                                               |
| `pnpm test:watch`                   | Vitest in watch mode                                                              |
| `pnpm test:coverage`                | Same, with V8 coverage (thresholds: 85% statements/branches/functions, 75% lines) |
| `pnpm typecheck`                    | `tsc -b` — no emit, project references                                            |
| `pnpm lint` / `pnpm lint:fix`       | ESLint flat config, including `eslint-plugin-solid`                               |
| `pnpm format` / `pnpm format:check` | Prettier                                                                          |
| `pnpm assets:sync`                  | Regenerates `src/assets/{stl,img}` from the repository root (see below)           |

`dev`, `build`, and `test` run `assets:sync` first, so a fresh clone needs no
manual step.

## Architecture

```
src/
  element/        the custom element: <truss-calibrator>, shadow root, styles, teardown
  components/     Calibrator (app root) · screens · steps · results · flow-ui · a11y
  flow/           step registry (titles, gates, next/back) and the engine (state machine)
  domain/         pure logic: types, number formatting, math, validation, draft, result
  storage/        adapter (localStorage + degraded mode), schema checks, printers, settings, transfer
  styles/         local.css (widget layout) + shadow.ts (stylesheet installation)
  assets/         STL and image URLs resolved against the module's own URL
  test-utils/     FakeHost storage double and createTestApp
```

The dependency direction is one way: `components` → `flow` → `domain`, and
`components` → `storage` → `domain`. `domain` imports nothing from the others,
which is what makes the arithmetic testable without a DOM.

- **`domain/math.ts`** is the single implementation of the calibration formula: the
  flow's average first, then the division by the designed length. Both flows call
  the same function, which is why the quad and quick flows agree exactly on the
  golden fixtures.
- **`storage/adapter.ts`** probes storage on construction (read _and_ write). When it
  is unavailable the app runs in **degraded mode**: everything still works
  in-memory, changes report `persisted: false`, and the save gate at Q7 is skipped
  as unsatisfiable rather than becoming a dead end.
- **`flow/registry.ts`** holds every step's title, gate, and neighbours. Adding or
  reordering a step is a data change, not a wiring change.
- **`components/Calibrator.tsx`** assembles the dependency graph **once per mount**.
  That matters more than it looks: the element passes no props, so a lazy getter
  there builds a new engine on every read and the widget silently stops responding.

## Embedding

The build emits one ES module plus its assets:

```
dist/
  truss-calibrator.js        # the entry — `<script type="module">`
  assets/…                   # STLs + WebP figures, referenced by relative URL
```

```html
<script type="module" src="/apps/truss/truss-calibrator.js"></script>
<truss-calibrator></truss-calibrator>
```

**The contract is deliberately empty** (PRD §6.1, decision 14):

- **No attributes, no properties, no events.** The element configures itself and
  reports nothing back. The host page must not set attributes on it or wait for a
  callback.
- **Ship the `assets/` directory next to the script.** Asset URLs are resolved
  against the module's own URL (`new URL('./assets/x.webp', import.meta.url)`), so
  any mount path works — the root, a sub-path, or a different origin — but the
  directory layout has to be preserved.
- **Styles are sealed.** The widget renders into an open shadow root and adopts its
  own stylesheets, so the host page's CSS cannot reach in and the widget's CSS
  cannot leak out. `rem` is the one exception worth knowing: inside a shadow tree it
  still resolves against the _host document's_ root font size, so the widget is
  designed to survive a host that changes it (all touch targets carry a `px` floor).
- **One script tag per page.** The element self-defines on import, and defining it
  twice is harmless.

### Two load-bearing settings in `vite.config.ts`

- `base: './'` — keeps asset references relative to the script, so sub-path mounts
  work.
- `solid({ solid: { delegateEvents: false } })` — **required for the widget to
  function at all.** Solid's default event delegation registers listeners on
  `document` and finds handlers via `event.target`, which the browser retargets to
  the host element across a shadow boundary; every control in the widget would be
  inert. `src/element/delegation.build.test.ts` fails if this is turned back on.

`build.lib` is deliberately **not** used: Vite's asset plugin short-circuits in
library mode and inlines every asset as a data URI, which would base64 the STLs
into the chunk and turn the download button into a `data:` URL.

## Testing

Vitest with jsdom, `test.css: true` (so `?inline` CSS imports are real strings), and
`test-setup.ts` registering `jest-dom` plus `afterEach(cleanup)` — Vitest globals are
off, so cleanup has to be explicit.

| Suite                   | Covers                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain/*.test.ts`      | Formatting and rounding, the calibration maths against the PRD's golden fixtures, validation rules                                                  |
| `storage/*.test.ts`     | Adapter degradation and corrupt-payload handling, printer repository rules, the settings flag, import/export transfer                               |
| `flow/engine.test.ts`   | Step order, gates, branching, exit decisions                                                                                                        |
| `components/*.test.tsx` | Screens, step chrome, accessibility helpers, and `flow.e2e.test.tsx` — whole flows driven through the real screens and engine with a storage double |
| `*.build.test.ts`       | Regenerate a real build and assert on the output: asset URL shapes, and that event delegation stays off                                             |

Conventions worth keeping:

- **Golden fixtures are hand-computed in comments** (`domain/math.test.ts`, PRD
  §14.1 fixtures A/B/C). A test that re-asserts the implementation's own arithmetic
  proves nothing, so every expected number is derived in the comment above it.
  Fixture B is also the rounding-tie case: `137.4625 / 140` is exactly `0.981875`,
  which is what pins half-away-from-zero rounding.
- **To verify the fixtures:** `pnpm test -- math` — Fixture A → 98.214%, Fixture B →
  98.188%, Fixture C → 98.188% from a single beam with a saved factor.
- **Some bugs are invisible in jsdom** — anything about the built bundle, event
  retargeting across a shadow boundary, or layout. Those are covered by the
  build-level tests and by checking the widget in a browser: `pnpm build && pnpm
preview --base=/apps/truss/`, then open the harness.
- **Fix the whole suite, not the failing test.** `pnpm test`, `pnpm typecheck`,
  `pnpm lint`, and `pnpm build` are all expected to be clean before a task is called
  done.
