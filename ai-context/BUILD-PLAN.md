# Build Plan — Truss Calibrator Webapp

Derived from `ai-context/PRD.md` (Draft v0.1). Task IDs are stable references; use them in branches, PRs, and commits.

- **38 tasks** across 10 phases. Every task is one focused work session or less.
- Every task lists **Depends on** (prerequisites) and **Unblocks** (dependents) — no orphans: the only root is T01, and every other task has at least one prerequisite and at least one dependent.
- **Working agreement:** PRD is the source of truth. If implementation reveals a PRD decision is wrong, update the PRD in the same PR, never silently diverge. Pure logic (math, storage, import/export) is test-first. A task is done when its tests pass, `typecheck` + `build` are green, and any PRD open item it closes is recorded in the PRD.

**Size legend:** S ≈ under an hour · M ≈ half a day · L ≈ a full day. No task is larger than L.

---

## Phase overview

```mermaid
flowchart TB
  P0["Phase 0 · Foundations<br/>T01–T05"]
  P1["Phase 1 · Core domain<br/>T06–T10"]
  P2["Phase 2 · Platform shell<br/>T11–T14"]
  P3["Phase 3 · Flow engine & UI<br/>T15–T17"]
  P4["Phase 4 · Printer data<br/>T18–T23"]
  P5["Phase 5 · Common section<br/>T24–T25"]
  P6["Phase 6 · Quad flow<br/>T26–T30"]
  P7["Phase 7 · Quick flow<br/>T31–T32"]
  P8["Phase 8 · Hardening<br/>T33–T36"]
  P9["Phase 9 · Docs & release<br/>T37–T38"]

  P0 --> P1
  P0 --> P2
  P1 --> P3
  P2 --> P3
  P1 --> P4
  P2 --> P4
  P3 --> P4
  P4 --> P5
  P3 --> P5
  P5 --> P6
  P6 --> P7
  P4 --> P8
  P7 --> P8
  P8 --> P9
```

**Parallel lanes after T01–T03** (three independent tracks, if more than one person is available):

| Lane | Tasks | Notes |
|---|---|---|
| A — Pure logic | T04 → T05 → T06 | No DOM; highest correctness value; do this first even solo. |
| B — Persistence | T04 → T07 → T08 → T09/T10 | Depends on Lane A only for shared types (T04). |
| C — Platform | T11, T12 → T13 → T14 | Asset pipeline is independent of all logic. |

**Critical path (15 tasks):** T01 → T02 → T05 → T06 → T15 → T24 → T25 → T26 → T27 → T28 → T30 → T32 → T33 → T34 → T38

---

## Phase 0 — Foundations

### T01 — Repair the scaffold and establish the tooling baseline
**Size:** S · **Depends on:** — (root) · **Unblocks:** T02, T03, T11, T37

**Context:** The scaffold is broken as committed: `src/index.tsx` imports `./index.css`, which does not exist (`src/styles/global.css` does), and `App.tsx` renders nothing. `index.html` still carries Vite defaults. Every later task assumes a working dev loop and a known set of scripts, so this lands first.

**Subtasks**
- [x] T01.1 Fix the entry stylesheet import; verify `pnpm dev` renders with no console errors
- [x] T01.2 Verify `pnpm build` and `pnpm preview` succeed; resolve any `tsconfig`/type errors that surface
- [x] T01.3 Update `index.html` (title, `lang`, meta) and settle its role as the **dev harness page** — it is not shipped UI
- [x] T01.4 Add scripts: `typecheck`, `test`, `test:coverage`, `lint`, `format`, `assets:sync`
- [x] T01.5 Add minimal ESLint (flat config, TS + Solid) and Prettier — configuration only, no plugin sprawl
- [x] T01.6 Pin and document the Node/pnpm versions used

---

### T02 — Test infrastructure
**Size:** M · **Depends on:** T01 · **Unblocks:** T05, T07, T10

**Context:** PRD §14 defines success as numeric parity with the documented manual procedure via hand-computed fixtures, so the test runner is not optional scaffolding — it is the acceptance mechanism. Vitest reuses the existing Vite config, which keeps the setup small.

**Subtasks**
- [x] T02.1 Install and configure Vitest against the existing Vite config; add a jsdom environment
- [x] T02.2 Add `@solidjs/testing-library` plus one smoke test proving component tests run
- [x] T02.3 Configure coverage output and a threshold gate
- [x] T02.4 Establish the convention: tests co-located as `*.test.ts(x)`
- [x] T02.5 Add a CI workflow (typecheck + test + build) on push and PR

---

### T03 — Close the blocking open items
**Size:** M · **Depends on:** T01 · **Unblocks:** T04, T05, T07, T11

**Context:** Four PRD open items block code. Two are effectively permanent: §13.7 storage key names (renaming after ship orphans stored user data) and §13.1 final percentage precision (it is the number users retype into a slicer). §13.2 gates validation and §13.3 gates the asset pipeline. The remaining open items (§13.4–§13.6) are closed inside the tasks that own those screens: T17, T18, T21, T22.

**Resolution:** §13.1 → 3dp (§13.1 records the arithmetic and the physical-resolution argument). §13.2 → storage keys frozen as `truss-calibrator:v1:printers` / `truss-calibrator:v1:settings` with the dual versioning scheme in PRD §7. §13.3 → 2.0mm (§8.3 derives it from the geometry rather than from a guess). §13.4 → images at 1400px long edge, WebP q82, no `srcset` (§13.3).

**Subtasks**
- [x] T03.1 Decide final percentage precision (§13.1) — inspect the Orca/Bambu XY shrinkage field's accepted precision; record the choice and rationale in PRD §8.2
- [x] T03.2 Finalize storage key names and versioning scheme (§13.7); record in PRD §7
- [x] T03.3 Decide the inner/outer divergence warning threshold (§13.2); record in PRD §8.3
- [x] T03.4 Decide image optimization targets (§13.3): display dimensions, output format, 1x/2x policy
- [x] T03.5 Mark these resolved in PRD §13

---

### T04 — Project structure and domain types
**Size:** M · **Depends on:** T01, T03 · **Unblocks:** T05, T07, T12, T15

**Context:** One place to define the app's vocabulary so the math, storage, and UI layers cannot drift — in particular the single shared `CalibrationDraft` (PRD §9.3, decision 2) and the printer record whose identity is its name (PRD §7, decision 5). Types should encode PRD invariants rather than restating them in prose.

**Subtasks**
- [x] T04.1 Create the directory layout: `src/domain`, `src/storage`, `src/flow`, `src/components`, `src/element`, `src/assets`
- [x] T04.2 Define `PrinterRecord`, `SettingsState`, and the versioned payload envelopes from PRD §7
- [x] T04.3 Define `CalibrationDraft` covering both quad (8 values) and single (2 values) variants
- [x] T04.4 Define step IDs, flow IDs, and the step gating/exit-contract types
- [x] T04.5 Define a shared result type for operations that can fail (storage, import) so failures are never thrown past the UI layer

---

### T05 — Rounding and number formatting utilities
**Size:** M · **Depends on:** T04, T03, T02 · **Unblocks:** T06, T16, T29

**Context:** PRD §8.2 mandates **round half-up**, deliberately departing from the outline's truncation. Note `toFixed` is not a correct implementation of round-half-up (binary representation makes cases like `1.005` and `0.981875` behave inconsistently), so this needs explicit exponent-based scaling. Display output must never be fed back into computation.

**Subtasks**
- [x] T05.1 Implement `roundHalfUp(value, places)` with integer/exponent scaling — not `toFixed`
- [x] T05.2 Add formatters for factor (10dp), ratio (5dp), and percentage (precision from T03.1)
- [x] T05.3 Implement a numeric parser accepting comma or point decimals and rejecting partial or garbage input
- [x] T05.4 Tests covering tie cases (`0.981875` → `0.98188`), the `1.005` float trap, zero, negatives, `NaN`, `Infinity`, and extreme magnitudes

---

## Phase 1 — Core domain logic

### T06 — Math engine (canonical, unified)
**Size:** L · **Depends on:** T05 · **Unblocks:** T15, T27, T28, T29

**Context:** PRD §8.1 is the heart of the product: both flows are **one** formula, $R = F \times (\text{basis}/140)$. The quad flow computes $F$ from 8 measurements and uses its own X average as the basis; the single flow uses the stored $F$ and the 2 measurements. Because multiplication commutes, the guides' two different phrasings are algebraically identical — the PRD requires one canonical evaluation order so the flows cannot diverge.

**Subtasks**
- [x] T06.1 Implement `average(values)`, `quadBasis(draft)`, `quadFactor(draft)`, `quadRatio(draft)`
- [x] T06.2 Implement `singleExtrapolatedAverage(measurements, factor)` and `singleRatio(...)` using the same canonical order
- [x] T06.3 Implement `applyCurrentSlicerValue(currentPercent, ratio)` at full precision
- [x] T06.4 Encode Fixtures A, B and C (PRD §14.1) as tests, with expected values hand-computed and the derivation written in comments
- [x] T06.5 Add a property test generalizing Fixture C: single flow must reproduce the quad result whenever its basis equals that calibration's X average
- [x] T06.6 Expose full-precision and display-rounded values from one entry point, so callers cannot accidentally compute from rounded data

---

### T07 — Storage adapter
**Size:** L · **Depends on:** T04, T03, T02 · **Unblocks:** T08, T09, T28, T33

**Context:** PRD §12 treats storage as unreliable by default. `localStorage` access can **throw** rather than return null (private browsing, disabled site data, restricted embedded contexts), writes can fail, and a corrupt payload must be preserved for export rather than overwritten — because the existing-wins import rule (decision 6) means re-importing cannot restore it.

**Subtasks**
- [x] T07.1 Implement capability detection that probes availability without throwing
- [x] T07.2 Implement typed read/write for the versioned envelopes with schema-version checks
- [x] T07.3 Implement the in-memory fallback plus reactive degraded-mode state for the banner
- [x] T07.4 Implement corrupt-payload handling: treat as empty, retain the raw string for export, never overwrite silently
- [x] T07.5 Handle quota-exceeded write failures through the same degraded-mode path
- [x] T07.6 Tests with a mock storage that throws, returns junk, and rejects writes

---

### T08 — Printer repository
**Size:** L · **Depends on:** T07 · **Unblocks:** T10, T18, T25, T28, T31

**Context:** Printers are the only persisted entity, identified by a unique trimmed case-insensitive name (PRD §7, decision 5). Centralizing CRUD, uniqueness enforcement, and record validation here means the UI never re-implements a rule — and the collision error type is what the mandatory save gate uses to present its recovery copy.

**Subtasks**
- [x] T08.1 Implement `list`, `getByName`, `exists(name)`, `add`, `update`, `remove`
- [x] T08.2 Implement name normalization and validation: trim, non-empty, unique case-insensitively
- [x] T08.3 Implement factor validation (finite, positive)
- [x] T08.4 Implement alphabetical case-insensitive sort as the canonical list order
- [x] T08.5 Return a typed name-collision error rather than throwing
- [x] T08.6 Tests covering CRUD, duplicate detection across case/whitespace, invalid factors, and degraded storage

---

### T09 — Settings store
**Size:** S · **Depends on:** T07 · **Unblocks:** T22, T24

**Context:** PRD §9.2 — a single global `skipPrerequisites` flag, persisted, reset only from the printer-data screen (decision 4). It must share the storage adapter's degraded-mode semantics: the flag must never *appear* set if it could not actually persist, or the prerequisite step would silently vanish for the session.

**Subtasks**
- [x] T09.1 Implement read/write of `skipPrerequisites` through the storage adapter
- [x] T09.2 Implement reset, consumed by the printer-data screen
- [x] T09.3 Tests including degraded storage

---

### T10 — Import/export serialization and merge
**Size:** L · **Depends on:** T08, T02 · **Unblocks:** T23, T33

**Context:** PRD §11.1–§11.3 — versioned JSON array of records, **full-precision numbers in the file** (writing display-rounded values would silently degrade stored factors on every round trip), merge by name with existing-always-wins, and all-or-nothing validation: a half-applied import is worse than a refused one.

**Subtasks**
- [x] T10.1 Implement the serializer producing the PRD's exact shape and the `truss-printers-YYYY-MM-DD.json` filename
- [x] T10.2 Guarantee full-precision numeric output — no display rounding may leak into the file
- [x] T10.3 Implement strict validation: JSON syntax, envelope shape, supported version, per-record name/factor validity
- [x] T10.4 Implement the merge: add-only, skip conflicts, return added count and skipped names
- [x] T10.5 Tests: export→import round trip is a no-op, conflicts skipped, every refusal reason distinct, duplicate names within one file, empty file, oversized file

---

## Phase 2 — Platform shell

### T11 — Asset pipeline
**Size:** M · **Depends on:** T01, T03 · **Unblocks:** T26, T31, T36

**Context:** PRD §6.3 — the three STLs at repo root are the source of truth and are copied at build time into gitignored app assets, so they cannot drift. Images from `Documentation/Images` (38MB, 31 files, 28 referenced, up to 2.7MB each) are resized per T03.4. The load-bearing constraint: URLs must resolve against the app's **own script URL**, never the page or domain root, or zero-config embedding under a sub-path breaks.

**Subtasks**
- [x] T11.1 Write `scripts/sync-assets` to optimize and copy the referenced images and copy the two used STLs (Quad, Single — not Dual) into the app's static assets
- [x] T11.2 Wire it as `predev`/`prebuild`; add generated paths to `.gitignore`
- [x] T11.3 Implement one shared asset-URL resolver used everywhere (`import.meta.url`-based; no root-absolute paths)
- [x] T11.4 Add a build test asserting emitted URLs are base-relative and resolve under a simulated sub-path
- [x] T11.5 Document the regeneration step in the app README stub

> **Decision (T11):** assets are emitted from the module graph (`src/assets/`), not `public/`,
> so references are script-relative rather than root-absolute. `base: './'` is set in
> `vite.config.ts` and pinned by test. `build.lib` **cannot** be used for the widget build:
> Vite's asset plugin short-circuits in library mode and inlines every asset as a data URI,
> ignoring `assetsInlineLimit`, which would base64 the STLs into the entry chunk. See T12.2.

---

### T12 — Custom element shell
**Size:** M · **Depends on:** T04 · **Unblocks:** T13, T14

**Context:** PRD §6.1–§6.2, decisions 13–14 — `<truss-calibrator>` with a shadow root, **zero configuration**: no attributes, no events, no imperative API, and no routing of any kind. It must clean up on disconnect (a host page may mount and unmount it freely) and keep the existing `index.html` usable as a development harness.

**Subtasks**
- [x] T12.1 Implement the element class: `attachShadow`, render a Solid root into it, dispose the root in `disconnectedCallback`
- [x] T12.2 Configure the element build emitting the JS the host page includes
> **Amended at T11:** originally "`vite build --lib`". Vite's asset plugin returns `true`
> unconditionally from `shouldInline()` when `config.build.lib` is set, so library mode inlines
> every asset as a data URI and ignores `assetsInlineLimit`. That would base64 the STLs into the
> entry chunk and turn the download button into a `data:` URL. The element is therefore built
> with a plain rollup input (`build.rollupOptions.input`) and `base: './'`, which emits real,
> script-relative asset files. No CSS file is emitted either: the app's stylesheets are imported
> with `?inline` so they can be adopted inside the shadow root (T13) instead of being linked by a
> page that does not exist.
- [x] T12.3 Repoint the dev harness to mount the element rather than `App` directly
- [x] T12.4 Set `delegatesFocus` and verify tab order into and through the widget
- [x] T12.5 Verify by grep/test that nothing in the app touches `location`, `history`, or deep links

> **Verified (T12.4):** in Chromium, `shadowRoot.delegatesFocus === true` and calling
> `host.focus()` moves focus to the first focusable inside the shadow root.

---

### T13 — Shadow-root styling foundation
**Size:** M · **Depends on:** T12 · **Unblocks:** T14, T15, T16, T17

**Context:** Decision 13 — styling is fully self-contained inside the shadow root, which **repeals** the brief's "add reusable styles to `global.css`" rule: parent selector-based rules cannot reach a shadow root, so `src/styles/**` is the app's private stylesheet set. This task also lands the responsive baseline required by decision 20 (desktop-first, mobile must not break).

**Subtasks**
- [x] T13.1 Bundle `vars.css` (tokens) and `global.css` into the shadow root via build-time CSS imports or `adoptedStyleSheets`
- [x] T13.2 Verify `elements/*` and `utility/**` stylesheets apply inside the shadow root
- [x] T13.3 Add app-specific styles in a dedicated module, per the brief's `local.css` convention
- [x] T13.4 Implement the responsive baseline: no horizontal scroll at 320px, readable at desktop widths
- [x] T13.5 Verify zero style leakage in **both** directions against a host page with deliberately conflicting global styles

> **Found & fixed at T13:** the `:root`→`:host` rewrite required whitespace or a brace before the
> selector, but minified CSS emits `@import …;:root{`. The source tests passed while the shipped
> bundle rendered unstyled. Fixed by allowing `;` as a delimiter, with regression tests on both
> the minified shape and the *built* artefact.
>
> **Cascade note:** rules in the outer tree beat `:host`, so a host page's `* { color: … }` reaches
> shadow descendants by inheritance. The app's baseline therefore also lives on
> `.truss-calibrator-root`, which the page cannot reach. `rem` still resolves against the document
> root inside a shadow tree, so a host page with a non-default root font-size scales the widget;
> recorded as a known, bounded deviation in PRD §6.2.

---

### T14 — Accessibility primitives
**Size:** M · **Depends on:** T12, T13 · **Unblocks:** T15, T16, T34

**Context:** PRD §6.4 — accessibility is a functional requirement. The specific hazard is that step transitions replace the entire view, so without deliberate focus management keyboard and screen-reader users are stranded on a destroyed element; and our warnings are non-modal by design, so they are invisible to assistive tech unless explicitly announced.

**Subtasks**
- [x] T14.1 Implement `focusStepHeading()` and wire it into every step transition
- [x] T14.2 Implement the live-region component for warnings and result announcements
- [x] T14.3 Implement labelled-field primitives with `aria-describedby`/`aria-invalid` association
- [x] T14.4 Respect `prefers-reduced-motion` in transitions
- [x] T14.5 Add a keyboard-only smoke test for traversal and activation

---

## Phase 3 — Flow engine and shared UI

### T15 — Flow engine
**Size:** L · **Depends on:** T04, T06, T14 · **Unblocks:** T17, T24, T30, T32

**Context:** PRD §9.3, decisions 1–2 — Back + Next over one shared in-memory draft, per-step gating, **no mid-flow persistence** (reload restarts at step 1), and an exit-confirmation rule keyed on whether measurements exist. It also owns in-app routing between landing, the flows, and the printer-data screen, with no URL involvement at all.

**Subtasks**
- [x] T15.1 Implement the step registry (id, title, content, gate predicate, next/back targets)
- [x] T15.2 Implement the draft store with per-step commit semantics and a `hasMeasurements()` predicate
- [x] T15.3 Implement navigation: Next gated by predicate, free Back, and flow re-entry resetting the draft
- [x] T15.4 Implement exit rules: confirmation only after the first measurement and before completion
- [x] T15.5 Implement flow-level navigation between landing, flows, and printer data (no URL involvement)
- [x] T15.6 Tests: gating, back/next, the exit-confirmation matrix, and reload-restarts-at-step-1

> **Design note (T15):** the registry holds metadata and gates only — no JSX — so it is testable
> without a DOM and cannot acquire an import cycle with the screens that render it. Step gates are
> built from declarative specs (`all` / `any` / `measurements` / `custom`) because most of the
> sixteen steps are one of two shapes. Checkbox state lives **in the draft**, so gates are pure
> functions of it and Back preserves ticks for free.

---

### T16 — Shared flow UI components
**Size:** L · **Depends on:** T13, T14, T05 · **Unblocks:** T17, T18, T24, T26, T27, T29, T31

**Context:** PRD §9–§10 — one small component set used by every step. Building these once is what prevents eight slightly-different numeric inputs (and eight different warning behaviours) across the two flows.

**Subtasks**
- [x] T16.1 Implement step chrome: heading (focus target), progress indication, Back/Next/Exit controls
- [x] T16.2 Implement the gated Next button with disabled state plus a reason
- [x] T16.3 Implement `CheckboxGroup` for prerequisite checklists
- [x] T16.4 Implement `MeasurementField`: unit label (mm), parser, blocking error, non-blocking warning, full accessible association
- [x] T16.5 Implement `DetailsBlock` for secondary values (label/value rows, tabular numerals)
- [x] T16.6 Component tests: warnings never block, Next enable/disable transitions, accessible attributes present

> **Amended at T16:** `parseNumber` now distinguishes `incomplete` (a half-typed `137.`) from
> `malformed` (`abc`). Both still block the gate — the gate reads the same parser — but only the
> latter marks the field invalid, so the field does not shout at the user mid-keystroke.

---

### T17 — Landing screen
**Size:** S · **Depends on:** T13, T16, T15 · **Unblocks:** T18

**Context:** PRD §9.1 — the entry point with two actions. It also carries open item §13.4 (exact copy, and whether to link the canonical documentation), which must be closed here rather than left implicit.

**Subtasks**
- [x] T17.1 Decide and record landing copy and documentation-link policy (§13.4)
- [x] T17.2 Implement the screen with both entry actions
- [x] T17.3 Wire entry into the flow engine and into the printer-data screen
- [x] T17.4 Component test: both actions render and route correctly

---

## Phase 4 — Printer data management

### T18 — Printer data screen shell
**Size:** M · **Depends on:** T16, T08, T17 · **Unblocks:** T19, T21, T22, T23, T25

**Context:** PRD §11 — the list shows name and formatted factor, sorted alphabetically case-insensitively (§13.6), with an empty state where importing is the obvious action — because the C2 empty-list copy explicitly points users here (decision 16). Returning from this screen always lands on the landing page (decision 17).

**Subtasks**
- [x] T18.1 Confirm and record sort order (§13.6)
- [x] T18.2 Implement the list view: name, formatted factor, per-row actions
- [x] T18.3 Implement the empty state with import as the primary action
- [x] T18.4 Implement the return path to the landing page
- [x] T18.5 Component tests: rendering, sort, empty state

---

### T19 — Add a printer manually
**Size:** S · **Depends on:** T18, T08 · **Unblocks:** T20

**Context:** PRD §11 — manual add exists for porting data in, and it is what legitimizes typed factors at all (decision 19). The inline warning on the factor field is required, because a hand-typed factor has no calibration behind it while looking identical to a measured one.

**Subtasks**
- [x] T19.1 Implement the add form (name + factor) with validation
- [x] T19.2 Add the inline warning explaining the value should come from a quad calibration
- [x] T19.3 Handle uniqueness failure with a specific message
- [x] T19.4 Tests: validation, warning presence, successful add

---

### T20 — Edit a saved printer
**Size:** S · **Depends on:** T19, T08 · **Unblocks:** T33

**Context:** Decision 19 — both name and factor are editable, with the factor carrying the same warning as T19. Editing is allowed deliberately: the alternative (delete and re-add) is only marginally stricter and notably more annoying.

**Subtasks**
- [x] T20.1 Implement editing for name and factor
- [x] T20.2 Enforce uniqueness on rename, excluding the record itself
- [x] T20.3 Reuse the T19 factor warning copy
- [x] T20.4 Tests: rename, factor change, rename collision, cancel

---

### T21 — Delete a printer
**Size:** S · **Depends on:** T18, T08 · **Unblocks:** T33

**Context:** PRD §11 — deletion is irreversible and confirmed. The confirmation copy (§13.6) should also acknowledge that deleting is the **only** way to resolve an existing-wins import conflict, since re-importing cannot overwrite a record (PRD §11.2).

**Subtasks**
- [x] T21.1 Confirm and record the confirmation copy (§13.6)
- [x] T21.2 Implement delete with a focus-safe confirmation
- [x] T21.3 Ensure the list and dependent UI refresh correctly
- [x] T21.4 Tests: confirm deletes, cancel preserves

---

### T22 — Prerequisites reset control
**Size:** S · **Depends on:** T18, T09 · **Unblocks:** T33

**Context:** PRD §9.2 — because C1 is skipped silently once the flag is set, this control is the user's **only** path back to the prerequisite guidance (decision 4 deliberately put it here rather than on the landing page).

**Subtasks**
- [x] T22.1 Decide and record placement and labelling (§13.5)
- [x] T22.2 Implement the control reflecting current flag state
- [x] T22.3 Wire it to the settings store reset
- [x] T22.4 Tests: flag clears and C1 reappears on the next run

---

### T23 — Import and export UI
**Size:** M · **Depends on:** T18, T10 · **Unblocks:** T33

**Context:** PRD §11.1–§11.2 — download with the specified filename; import with distinct refusal reasons and a skipped-conflict report. The UI must state the existing-wins consequence (restoring an older backup over current data requires deleting first), or users will read it as a bug.

**Subtasks**
- [x] T23.1 Implement export download using the T10 serializer
- [x] T23.2 Implement the file picker and parse/validate path
- [x] T23.3 Surface every refusal reason distinctly — unsupported version, malformed shape, invalid record
- [x] T23.4 Report the merge outcome: added count and skipped names
- [x] T23.5 Surface the existing-wins consequence and the delete-then-import workaround
- [x] T23.6 Tests for each refusal path and for a successful merge

---

## Phase 5 — Common section

### T24 — Common step C1 (prerequisites)
**Size:** M · **Depends on:** T15, T16, T09 · **Unblocks:** T25

**Context:** PRD §9.2 — three checkboxes gating Next, a "Don't ask again" control available only once all three are ticked, persisted as a global flag, and skipped on subsequent runs. The substantive requirements from `0-Start-Here.md` (caliper range and drift check, printer calibration, slicer capability) must actually be present, since this step is the only place they appear.

**Subtasks**
- [x] T24.1 Implement the checklist with gating
- [x] T24.2 Implement the "Don't ask again" control with its all-checked precondition
- [x] T24.3 Implement skip-on-subsequent-runs from the persisted flag
- [x] T24.4 Author the prerequisite copy (caliper/printer/slicer requirements) fresh from `0-Start-Here.md`
- [x] T24.5 Tests: gating, flag persistence, skip behaviour, and no-confirmation exit at this step

---

### T25 — Common step C2 (flow branch)
**Size:** M · **Depends on:** T24, T08, T18 · **Unblocks:** T26, T31

**Context:** PRD §9.2, decision 16 — the Yes/No branch, plus the disabled Single-flow option carrying this verbatim copy: `No printers saved - run a first-time calibration first or import saved printer profiles.` The printer list must be re-read on entry, because the detour's whole purpose is that the list changed. Leaving here is lossless, so no confirmation.

**Subtasks**
- [x] T25.1 Implement the branch UI with gating
- [x] T25.2 Implement the no-printers disabled state with the verbatim copy
- [x] T25.3 Implement the detour button into the printer-data screen
- [x] T25.4 Re-read the printer list when the step is (re)entered
- [x] T25.5 Tests: enabled/disabled matrix, exact copy string, detour and return-to-landing

> **Note (T25.3).** The detour is a plain button to the printers screen, placed under the closing copy. Because returning from that screen always lands on the landing page (decision 17), the user re-enters the flow and reaches C2 again with a freshly read list — which is the point of the detour. The list itself is a reactive read of the repository, so no explicit "re-read on entry" code is needed (T25.4).
>
> **Note (T25.1) — bug found by the T30.4 end-to-end test.** C2's `next` is `null` because the branch decides the destination, and `StepChrome` read "no literal next" as "hide Next". C2 therefore had no way forward at all: the second screen of the app was a dead end. `StepSpec` now carries an explicit `showNext` (default `true`), set to `false` only on the two terminal steps (Q9, S7), and Next's visibility is no longer inferred from `next`.

---

## Phase 6 — Quad calibration flow

### T26 — Quad instructional steps Q1–Q4
**Size:** M · **Depends on:** T25, T16, T11 · **Unblocks:** T27

**Context:** PRD §9.3 — filament prerequisites, slicing (with a **working** download and seam-placement guidance), printing (with the cool-down and plate-removal warnings), and locating the X-beam. All copy is authored fresh (decision 21) while the images are reused from `Documentation/Images` via T11.

**Subtasks**
- [x] T26.1 Q1 filament prerequisites checklist with gating
- [x] T26.2 Q2 slicing step: Quad STL download, seam guidance, confirm gate
- [x] T26.3 Q3 printing step: cool-down and plate-removal warnings, confirm gate
- [x] T26.4 Q4 locate X-beam step with its image
- [x] T26.5 Author the fresh copy per step and map the reused images
- [x] T26.6 Tests: gates, download URL correctness under a sub-path, no-confirmation exits

> **Note (T26.6).** Download URL shape is asserted in the unit suite and, separately, against a real build with a sub-path base (`urls.build.test.ts`). The stronger finding was on exits — see the T30.3 note.

---

### T27 — Quad measurement steps Q5–Q6
**Size:** L · **Depends on:** T26, T16, T06 · **Unblocks:** T28, T31

**Context:** PRD §9.3, §8.3 — two inputs at Q5 and six at Q6, carrying the seating guidance and the correct/incorrect caliper examples. This is the highest-risk screen in the product: the guides explicitly warn that an incorrectly seated caliper yields a meaningless diagonal reading, and a wrong value here propagates into a slicer setting.

**Subtasks**
- [x] T27.1 Q5: X outer/inner inputs with guidance and warnings
- [x] T27.2 Q6: Y, A, B outer/inner inputs, repeating the measurement guidance
- [x] T27.3 Apply PRD §8.3 validation: blocking (empty/non-numeric/≤0) and non-blocking (plausible range, `inner ≥ outer`, divergence per T03.3)
- [x] T27.4 Persist entered values into the shared draft so Back navigation preserves them
- [x] T27.5 Tests: full validation matrix, warnings non-blocking, Back preserves values, no cross-axis value mixing

---

### T28 — Quad factor step Q7 (compute + mandatory save gate)
**Size:** L · **Depends on:** T27, T06, T08, T07 · **Unblocks:** T30, T33

**Context:** PRD §9.3, §12, decisions 9–10, 15 — display the factor at 10dp, then require a unique name and a successful save before the user may continue. A collision is a hard block, and because flow state is not persisted, its error copy must state the recovery path explicitly (Exit → delete the record → restart, losing all eight measurements) or users will read it as a bug. When storage is unavailable the gate is skipped as unsatisfiable, the banner is shown, and the factor is still displayed so the user can write it down.

**Subtasks**
- [x] T28.1 Compute and display the extrapolation factor (10dp)
- [x] T28.2 Implement the name field with live uniqueness feedback against the repository
- [x] T28.3 Implement the collision hard block including the explicit data-loss recovery copy
- [x] T28.4 Implement the storage-unavailable path: skip the gate, show the banner, still show the factor
- [x] T28.5 Gate Next on a successful save, or on degraded mode
- [x] T28.6 Tests: save success, collision block, degraded mode, factor formatting

> **Note (T28.4).** Degraded mode marks `CHECKS.printerSaved` from `onMount` rather than teaching the gate registry about storage. The gate stays a pure function of the draft, and the *reason* the check is satisfied is documented at the call site. The name field and save button are hidden entirely, so there is no field the user can fill in that silently does nothing.

---

### T29 — Results screen (shared by both flows)
**Size:** L · **Depends on:** T16, T05, T06, T14 · **Unblocks:** T30, T32

**Context:** PRD §10, decision 8 — the slicer-ready percentage is the hero with copy-to-clipboard, but it must also be legible for manual transcription, because the clipboard does not cross devices when a user measures at the printer and edits the slicer elsewhere. Details differ per flow, so the component is variant-driven. Recalculation must use full precision, never the displayed rounded ratio.

**Subtasks**
- [x] T29.1 Implement the hero percentage with copy control and a transcribable presentation
- [x] T29.2 Implement the current slicer value input (default `100%`) with validation and soft range warnings
- [x] T29.3 Implement the details block for both variants — quad: 8-value average, X average, factor, ratio; single: 2 values, average, stored factor, extrapolated average
- [x] T29.4 Author the slicer-entry instructions content
- [x] T29.5 Recompute on current-value change at full precision
- [x] T29.6 Tests: both variants' details, precision behaviour, warnings on unusual current values

> **Note (T29.5).** The current slicer value is seeded from the draft with `untrack`, and the input owns it from then on. A tracked read there would rewrite the field while the user is typing. Recalculation itself uses the full-precision ratio, never the displayed 5dp form — the T29.6 test with a current value of 98 pins this (0.981875 × 0.98 → 96.224, which the rounded ratio gets wrong).

---

### T30 — Quad results integration and exit (Q8–Q9)
**Size:** M · **Depends on:** T28, T29, T15 · **Unblocks:** T32, T33

**Context:** PRD §9.3 — the save gate precedes the result (decision 9), and exit returns to the landing screen (decision 17). The exit-confirmation rule must hold from the first measurement onward.

**Subtasks**
- [x] T30.1 Wire Q7 → Q8 results using T29
- [x] T30.2 Implement the exit action returning to the landing screen
- [x] T30.3 Verify the exit-confirmation rule at every step from Q5 onward
- [x] T30.4 End-to-end test: full quad flow from landing to exit using Fixture B

> **Note (T30.3) — bug found by the end-to-end test.** Exit was implemented as the *fallback* for the Back slot in `StepChrome`, so it existed only on C1. From Q1 onward the only way out of a flow was to walk Back through every screen. PRD §9.2 (and the §14 acceptance table) require Back + Next + Exit on every step, with the confirmation conditioned on whether a measurement has been entered. The chrome now always renders Exit, and `requestExit` still decides whether to confirm — which is what makes C1–C2 and Q1–Q4 leave without a dialog.
>
> **Note (T30.4).** The end-to-end suite lives in `src/components/flow.e2e.test.tsx` and drives the real screens through the real engine with a storage double. This is the layer that caught both wiring bugs above: each component was correct in isolation, and the mistakes were in how they were connected.

---

## Phase 7 — Quick calibration flow

### T31 — Quick flow S1–S5
**Size:** L · **Depends on:** T25, T27, T08, T11 · **Unblocks:** T32

**Context:** PRD §9.4 — printer picker (name + factor), filament prerequisites, slicing the Single design, printing, and the two measurements with full seating guidance. The measurement component and validation rules are reused from the quad flow rather than reimplemented.

**Subtasks**
- [x] T31.1 S1 printer picker listing saved printers with factors, gated on selection
- [x] T31.2 S2 filament prerequisites checklist
- [x] T31.3 S3 slicing step with the Single STL download and seam guidance
- [x] T31.4 S4 printing step with the cool-down warning
- [x] T31.5 S5 measurement step with both values and full guidance
- [x] T31.6 Tests: picker with one and many printers, gates, validation reuse

> **Note (T31.5).** S5 reuses `MeasureStep`/`AxisMeasurements` with `axes={['X']}` and the single variant's figures, so the seating guidance and the validation rules are literally the same code as Q5 — not a copy. S1's list is a reactive read of the repository, sorted by the repository itself.

---

### T32 — Quick flow results and exit (S6–S7)
**Size:** M · **Depends on:** T31, T29, T30 · **Unblocks:** T33

**Context:** PRD §8.1 — the single flow multiplies the measured average by the stored factor using the **same canonical order** as the quad flow, then reuses the results screen. Fixture C is the acceptance test that the extrapolation model is implemented consistently: with a basis equal to the quad calibration's X average, the single flow must reproduce that calibration's ratio exactly.

**Subtasks**
- [x] T32.1 Wire S5 → S6 results using T29's single variant
- [x] T32.2 Verify Fixture C end-to-end through the UI
- [x] T32.3 Implement S7 exit to landing with the confirmation rule
- [x] T32.4 End-to-end test: full quick flow

> **Note (T32.2).** Fixture C is verified twice: as arithmetic in `math.test.ts`, and through the UI in `flow.e2e.test.tsx` (seed the repository with Fixture B's factor, measure 137.60/137.40, read 98.188 off the hero). The UI test is the one that proves the *stored* factor is what the single flow extrapolates by, rather than a value recomputed at display precision.

---

## Phase 8 — Hardening and verification

### T33 — Edge-case hardening suite
**Size:** L · **Depends on:** T30, T32, T28, T20, T21, T22, T23, T07 · **Unblocks:** T34, T35, T36

**Context:** PRD §12 — every documented failure mode needs an end-to-end exercise, not just a unit test: unavailable storage, corrupt payload, refused import, empty printer list, name collision, invalid input, and the two accepted data-loss paths. The specific risk this guards is a path that silently discards entered measurements without any of the documented warnings.

**Subtasks**
- [x] T33.1 Storage-unavailable suite: banner present, save gate skipped, factor still displayed
- [x] T33.2 Corrupt-payload suite: no crash, raw string exportable, nothing overwritten
- [x] T33.3 Import refusal suite covering every reason, plus the successful merge path
- [x] T33.4 Empty-list and collision suites, asserting the verbatim copy strings
- [x] T33.5 Verify no undocumented path loses entered measurements silently

> **Note (T33.5).** The rule is stated in terms of the *draft*, not the current screen: the confirmation is shown whenever leaving would discard readings, so backing up to an instructional step (Q4) and then exiting still confirms, while stepping backwards never does. An end-to-end test asserts both halves, and that the only controls on a measured step are Back, Exit and Next — the printer detour lives on C2, before anything can be lost.

---

### T34 — Accessibility audit
**Size:** M · **Depends on:** T33, T14 · **Unblocks:** T38

**Context:** PRD §6.4 and §14 — accessibility was scoped as a functional requirement, so it needs a verification pass. A forms-heavy multi-step flow is the one category where basic a11y is cheap now and expensive to retrofit.

**Subtasks**
- [x] T34.1 Keyboard-only walkthrough of both flows and the printer-data screen; fix any traps
- [x] T34.2 Verify focus lands on each step heading and on warning/error reveal
- [x] T34.3 Verify warnings and results are announced and fields carry correct associations
- [x] T34.4 Check contrast and touch-target sizes against a defined minimum
- [x] T34.5 Verify `prefers-reduced-motion`; record findings and fixes

> **Findings (T34.1–T34.3).** Keyboard-only tests drive a flow from the landing screen with Tab/Space/Enter alone and assert that focus lands on each new step heading, that the heading is not itself a Tab stop (`tabindex="-1"`), and that the exit confirmation takes focus on **Stay**. Live-region announcements and `aria-describedby` associations are covered in `a11y.test.tsx`; in the browser the polite region was observed to carry "Saved Rig One." after the save at Q7.
>
> **Findings (T34.4).** Measured in the browser against the built bundle: buttons rendered at **41px** tall at a 16px root font size — above the WCAG 2.5.8 minimum (24px) but below the 44px that Apple and Google publish as the comfortable floor — so `local.css` now sets a `min-height: 44px` floor on buttons and `.button` (re-measured: 44px). The floor is in `px` deliberately: `rem` inside a shadow tree resolves against the *host page's* root font size, and a host with `html { font-size: 10px }` was measured shrinking the buttons to 26px. Contrast of the tokens in use: body text `#414141` on white ≈ 10.2:1, de-emphasised `#6a6a6a` ≈ 5.4:1, button `#fafafa` on `#414141` ≈ 9.8:1. The disabled state (`#a8a8a8` on `#6a6a6a` ≈ 2.3:1) is below the text minimum, which is why the gate's blocking *reason* is always rendered as separate text at ≈ 5.4:1 — the disabled colour is never the only carrier of the information.
>
> **Findings (T34.5).** `local.css` disables animation and transition duration under `@media (prefers-reduced-motion: reduce)`, and `useReducedMotion()` reports `false` when the platform cannot be asked. The app animates nothing by choice: step changes are immediate, so reduced motion changes nothing except that the guard is already in place for anything added later.

---

### T35 — Responsive and mobile pass
**Size:** M · **Depends on:** T33 · **Unblocks:** T38

**Context:** Decision 20 — desktop-first, but mobile must not break. The six-input measurement step and the results hero are the two places most likely to fail at narrow widths, and the hero must stay transcribable because the clipboard does not cross devices.

**Subtasks**
- [x] T35.1 Verify every step from 320px upward; fix overflow and cramped layouts
- [x] T35.2 Set appropriate `inputmode`/numeric entry affordances
- [x] T35.3 Verify the results hero is transcribable at phone width
- [x] T35.4 Re-verify the six-input measurement step at narrow widths

> **Bug found (T35.4) — the measurement inputs were 30px wide.** Measured against the built element in a browser: every measurement field rendered at its *intrinsic minimum*, about 30px, at **every** viewport width, so a reading could neither be read nor typed by a person. The cause was inherited rather than written: the element stylesheets float every `label` and give it `width: 100%`, the floated label consumed the whole line, and the `display: flex` row holding the input was therefore laid out beside the float with an available width of **zero** (the row reported `width: 0` while painting its children to the right). `local.css` now sets `label { float: none }` for the whole app — every label here is block-level and owns its line — and gives the field's row `flex: 1 1 auto; inline-size: auto; min-inline-size: 0` so the input grows and the `mm` unit stays beside it. Re-measured after the fix: 206px at a 320px viewport, 276px at 390px, 283px in the 768px two-column layout; the shadow root's `scrollWidth` now equals its `clientWidth` at every width, nothing paints past the viewport, and the corrected cascade order is guarded by a build-level test.
>
> **Why it survived until now.** jsdom has no layout, so no DOM test can see it; and the earlier browser checks measured overflow *relative to the viewport*, which a 30px input overflowing its own 0px row does not breach. The values in those checks had also been set programmatically, which is exactly how a field that is too small to type into still "works". Screenshots and a real keyboard are the only honest check for this class of defect.
>
> **Findings (T35.1–T35.3).** At 320px, 390px, 414px and 768px: no horizontal scroll, no element past the viewport, and the shadow root's own `scrollWidth` equals its `clientWidth` throughout the guided steps, the six-input step, the save gate and the results screen. The hero percentage was read off the built widget at phone width ("98.188%") and is rendered in tabular figures so the digits can be transcribed. All measurement inputs carry `inputmode="decimal"` in the built DOM.

---

### T36 — Embedding and deployment verification
**Size:** M · **Depends on:** T33, T11 · **Unblocks:** T37, T38

**Context:** PRD §6.1–§6.3, decisions 13–14 — the app must work standalone **and** embedded under an arbitrary sub-path with zero configuration, resolving assets against its own script URL. This is the task that actually proves the embedding requirement rather than assuming it.

**Subtasks**
- [x] T36.1 Build a host-page harness that loads the built element from a sub-path
- [x] T36.2 Verify downloads and images resolve correctly under that sub-path
- [x] T36.3 Verify no style leakage against deliberately conflicting host styles
- [x] T36.4 Verify the standalone `preview` build still works
- [x] T36.5 Record deployment requirements (paths, no-attribute contract) for the parent-site team

> **Bug found (T36.1) — the shipped widget was inert in a real browser.** Solid's JSX `onClick` compiles to **event delegation**: one listener on `document`, and the handler found through a `$$click` property starting from `event.target`. Outside a shadow root the browser *retargets* `event.target` to the host element, so the walk never reaches the clicked button and **no control in the widget responded** — while the entire jsdom suite stayed green, because jsdom does not retarget `event.target` for document-level listeners. Fixed with `solid({ solid: { delegateEvents: false } })` in `vite.config.ts`, which attaches real listeners to the elements. Guarded by a build-output test (`src/element/delegation.build.test.ts`) asserting the chunk contains no `$$<event>` markers and does attach `addEventListener("click")`; the guard was verified to fail with delegation switched back on.
>
> **Bug found (T36.4) — one engine per render.** The first fix for the above was a lazy `dependencies()` getter in `Calibrator.tsx`. Since the element passes no props, every read built a *new* engine: navigation worked visually but acted on an empty instance. The widget was still inert after the delegation fix. The dependency graph is now assembled exactly once per mount. Both are recorded in the repository notes as "jsdom cannot see this".
>
> **Verified (T36.1–T36.4).** With `vite preview --base=/apps/truss/` and the harness served from `http://localhost:4175/apps/truss/`: the element mounted and the full quad flow ran by clicking inside the shadow root (Q5 → Q6 → Q7 factor `0.9997272727` → save → Q8 `98.188%` → Q9); the STL download href resolved to `/apps/truss/assets/quad-*.stl` and a range request returned **206** (a real file, not a `data:` URI); all 7 figures on the slicing step loaded from `/apps/truss/assets/…` (`naturalWidth` > 0, none failed); the widget's text stayed `#414141` while the host's own `<h1>` stayed rebeccapurple — no leakage in either direction; `delegatesFocus: true` with focus landing inside the shadow root.
>
> **Deployment requirements (T36.5).** Ship `truss-calibrator.js` **and** the adjacent `assets/` directory together, and load the script with a relative `src` (or from a `<script type="module">` tag whose own URL is under the mount path). Asset URLs are resolved against the module's own URL, so any sub-path works and no configuration is needed. The element takes **no attributes, emits no events, and exposes no API** (decision 14, PRD §6.1): the host page must not set attributes on it or expect callbacks, and must not rely on the parent page's styles reaching inside.

---

## Phase 9 — Documentation and release readiness

### T37 — Developer documentation
**Size:** M · **Depends on:** T36, T01 · **Unblocks:** T38

**Context:** Operational knowledge currently lives only in the PRD and this plan. Someone picking the repo up needs to build, test, regenerate assets, and embed the widget without reconstructing that context.

**Subtasks**
- [x] T37.1 Write `truss-webui/README.md`: setup, scripts, architecture map
- [x] T37.2 Document the asset pipeline (sources, sync script, gitignore policy, regeneration)
- [x] T37.3 Document embedding: tag name, zero-config contract, required JS/CSS, the no-attributes rule
- [x] T37.4 Document testing conventions and how to verify the golden fixtures
- [x] T37.5 Link the app README to `ai-context/PRD.md`

> **Note (T37).** The README keeps the scaffold's toolchain and asset sections (they were already written and accurate) and replaces the Vite boilerplate with the real script table, the module map with its dependency direction, the embedding contract, and the testing conventions — including a note on which suites exist because jsdom *cannot* see the failure they guard. It links to `../ai-context/PRD.md` and `../ai-context/BUILD-PLAN.md` at the top, and the root `README.md` now links back to it.

---

### T38 — Final acceptance and release readiness
**Size:** M · **Depends on:** T34, T35, T36, T37 · **Unblocks:** — (terminal)

**Context:** PRD §14 — success is correctness parity plus end-to-end completion, with the caveat that the product fails *quietly*: a mis-implemented averaging or extrapolation still yields a plausible number near `0.98`. This task is the explicit gate before the project can be called done.

**Subtasks**
- [x] T38.1 Verify PRD §14 acceptance criteria 1–3 explicitly and record evidence
- [x] T38.2 Re-run Fixtures A/B/C and confirm the rounding-tie behaviour still holds
- [x] T38.3 Walk both flows end-to-end in the embedded harness, on desktop and at phone width
- [x] T38.4 Confirm every PRD non-goal is absent from the build (history, filament storage, sync, slicer integration, analytics)
- [x] T38.5 Review all remaining PRD §13 open items; resolve or explicitly defer with an owner
- [ ] T38.6 Tag the release and update the root `README.md` Todo section

> **Evidence (T38.1 — PRD §14).**
> 1. *Numeric parity.* Fixtures A/B/C are hand-derived in the comments of `domain/math.test.ts` and independently re-checked through the UI in `flow.e2e.test.tsx`. In the built element, in a browser, at phone width: Fixture B through the quad flow → factor `0.9997272727`, hero **98.188%**; Fixture C's readings through the single flow (using the factor the quad flow just saved) → extrapolated average `137.46`, ratio `0.98188`, hero **98.188%** — the two flows agree exactly, which is the §14.1 Fixture C requirement.
> 2. *Both flows usable, desktop and mobile.* Both flows were walked to completion in the embedded harness (sub-path mount) by clicking inside the shadow root, and the layout was measured from 320px to 1280px with no horizontal scroll; a real layout defect was found and fixed (see the T35 note).
> 3. *Edge cases.* Empty printer list (C2's Single option disabled with the verbatim copy), storage unavailable (banner, save gate skipped, factor still shown), name collision (hard block with the recovery path spelled out), invalid input (blocking errors and non-blocking warnings, both asserted), corrupt payload (treated as empty, raw string retained for export), refused import (each reason distinct) — all covered by tests, listed in §14's order.
>
> **Evidence (T38.2).** `pnpm test -- math` → Fixture A `0.98214` / `98.214%`, Fixture B `0.9997272727` / `0.98188` / `98.188%`, Fixture C reproducing Fixture B's ratio bit-for-bit. The tie case is pinned: `137.4625 / 140` is exactly `0.981875`, so half-away-from-zero rounding gives `0.98188` and truncation would give `0.98187`; the assertion excludes the truncated value by name. The 10dp transcription path is separately quantified (it can move the last displayed digit) rather than left as an untested assumption.
>
> **Evidence (T38.3).** In the harness served from `http://localhost:4176/apps/truss/`: the quad flow ran end to end at 390px and the quick flow ran end to end at 390px and 1280px; the STL download returned 206 from the sub-path and all 7 figures on the slicing step loaded; the host's own heading stayed rebeccapurple while the widget stayed `#414141`. Earlier acceptance runs covered the quad flow at 320px.
>
> **Evidence (T38.4).** Scanning both the source and the built bundle: zero occurrences of `pushState`, `replaceState`, `serviceWorker`, `sendBeacon`, `XMLHttpRequest`, `fetch(`, `gtag`, or `analytics`; exactly two storage keys, both the frozen ones; only the Quad and Single STLs ship, with no reference to Dual anywhere in the bundle. No calibration history, no filament profiles, no accounts, no slicer integration, no telemetry.
>
> **Evidence (T38.5).** All seven §13 items are recorded as closed in the PRD, and each is implemented: 3dp percent precision (§13.1), the 2.0mm divergence threshold (§13.2), 1400px WebP q82 with no `srcset` (§13.3), landing copy with no outbound links (§13.4), the prerequisites reset on the printer screen (§13.5), case-insensitive alphabetical sort plus the delete-confirmation copy (§13.6), and the frozen storage key names (§13.7). Nothing is left deferred and nothing needs an owner.
>
> **T38.6 — partially done; the tag is deliberately left to the repo owner.** The root `README.md` Todo section and the two stale "webapp is planned" sentences have been updated. Tagging is **not** done: the working tree contains the whole project as uncommitted work, so a tag now would point at the wrong commit. The step is: review and commit, then `git tag -a v1.0.0 -m "Truss calibrator webapp" && git push --tags`.

---

## Dependency matrix

| Task | Depends on | Unblocks |
|---|---|---|
| T01 | — | T02, T03, T11, T37 |
| T02 | T01 | T05, T06, T07, T10 |
| T03 | T01 | T04, T05, T07, T11 |
| T04 | T01, T03 | T05, T07, T12, T15 |
| T05 | T04, T03, T02 | T06, T16, T29 |
| T06 | T05 | T15, T27, T28, T29 |
| T07 | T04, T03, T02 | T08, T09, T28, T33 |
| T08 | T07 | T10, T18, T25, T28, T31 |
| T09 | T07 | T22, T24 |
| T10 | T08, T02 | T23, T33 |
| T11 | T01, T03 | T26, T31, T36 |
| T12 | T04 | T13, T14 |
| T13 | T12 | T14, T15, T16, T17 |
| T14 | T12, T13 | T15, T16, T34 |
| T15 | T04, T06, T14 | T17, T24, T30, T32 |
| T16 | T13, T14, T05 | T17, T18, T24, T26, T27, T29, T31 |
| T17 | T13, T16, T15 | T18 |
| T18 | T16, T08, T17 | T19, T21, T22, T23, T25 |
| T19 | T18, T08 | T20 |
| T20 | T19, T08 | T33 |
| T21 | T18, T08 | T33 |
| T22 | T18, T09 | T33 |
| T23 | T18, T10 | T33 |
| T24 | T15, T16, T09 | T25 |
| T25 | T24, T08, T18 | T26, T31 |
| T26 | T25, T16, T11 | T27 |
| T27 | T26, T16, T06 | T28, T31 |
| T28 | T27, T06, T08, T07 | T30, T33 |
| T29 | T16, T05, T06, T14 | T30, T32 |
| T30 | T28, T29, T15 | T32, T33 |
| T31 | T25, T27, T08, T11 | T32 |
| T32 | T31, T29, T30 | T33 |
| T33 | T30, T32, T28, T20, T21, T22, T23, T07 | T34, T35, T36 |
| T34 | T33, T14 | T38 |
| T35 | T33 | T38 |
| T36 | T33, T11 | T37, T38 |
| T37 | T36, T01 | T38 |
| T38 | T34, T35, T36, T37 | — |

**Orphan check:** T01 is the single root; T38 is the single terminal. Every task in between has at least one entry in both the *Depends on* and *Unblocks* columns, so there are no disconnected or dangling tasks.

---

## Risk register

| Risk | Where it bites | Mitigation |
|---|---|---|
| Rounding implemented with `toFixed` instead of round-half-up | T05 → every displayed number | Fixture B lands exactly on a tie (`0.981875`); it fails under truncation or naive `toFixed` |
| The two flows' formulas drift apart | T06, T31, T32 | One canonical formula; Fixture C asserts cross-flow equivalence |
| Base-relative asset URLs regress | T11, T26, T31, T36 | Build test asserting resolution under a simulated sub-path (T11.4, T36.2) |
| Storage key names change after users have data | T03.2, T07 | Key naming is closed *before* any persistence code is written |
| Storage failures produce an unrecoverable mid-flow dead end | T07, T28, T33 | Degraded mode skips the mandatory gate rather than blocking (decision 15) |
| Documentation copy drifts from the canonical guides | T24, T26, T27, T31 | Accepted risk (decision 21); copy authored fresh and reviewed against the guides during T38.5 |
| Fixing a11y after both flows are built | T34 | Primitives land early in T14 and are used by T16 rather than retrofitted |
