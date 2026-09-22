# Implementation Plan — Truss Shrinkage Calibrator Webapp

Derived from `ai-context/PRD.md`. This plan is ordered and dependency-driven.
Every task lists the task IDs it **depends on** (must be complete first). There
are no orphan tasks: every task connects to the graph and the graph terminates
at the release task.

Conventions:
- IDs are stable and referenced by later tasks.
- Each task is small enough to land in one focused session, large enough to be
  independently verifiable.
- Suggested module layout follows PRD §8:
  `src/lib/` (pure logic), `src/components/ui/` (shared primitives),
  `src/pages/` (screens), `src/App.tsx` (root state).
- Unit tests use Vitest (Vite-native), colocated as `*.test.ts`.

## Dependency overview

```
T01 ─┬─ T02 ─┬─ T03 ─┬─ T07 ─┐
     │       ├─ T04 ─┤       │
     │       └─ T05 ─┘       │
     ├─ T06                  │
     └─ T09 ── T10           │
T03 ── T08 ─┬─ T12 ── T19 ── (Quad T20..T28) ── T29 ─┐
            ├─ T11 ── T13 ── (Printers T14..T17) ── T18 ─┤
            └─ T10                                  T30 ── (Single T31..T36) ── T37 ─┤
                                                                                       ├─ T38,T39 ── T40 ── T41 ── T42
```

Critical path: `T01 → T02 → T03 → T08 → T12 → T19 → T25 → T26 → T27 → T28 → T29 → T40 → T41 → T42`.

---

## Phase 0 — Foundation (pure logic + tooling)

### T01 — Tooling & project baseline

**Context:** The Vite + SolidJS + TypeScript scaffold already exists under
`truss-webui`. Before writing features, confirm the toolchain is correct and
add a test runner. Keep configuration minimal (PRD §4, §8).
**Deliverable:** A building, type-checked, testable scaffold with `base: '/'`.
**Depends on:** —
**Size:** S

- [x] T01.1 Verify `package.json` scripts: `dev`, `build`, `preview`; confirm `pnpm install` and `pnpm build` succeed on the clean scaffold.
- [x] T01.2 Enable TypeScript `strict` in `tsconfig.app.json` and confirm the project type-checks.
- [x] T01.3 Add Vitest with a `test` script and one smoke test to prove the runner works.
- [x] T01.4 Set Vite `base: '/'` in `vite.config.ts` and document why (standalone at subdomain root, PRD §19).
- [x] T01.5 Add a minimal lint/format script (ESLint + Prettier or Biome) and run it over the scaffold.

### T02 — Domain types & constants

**Context:** Centralize the vocabulary from PRD §6 and §7 so every module shares
one source of truth. No logic here — types and constants only.
**Deliverable:** `src/lib/types.ts` and `src/lib/constants.ts`.
**Depends on:** T01
**Size:** S

- [x] T02.1 Define `Printer = { name: string; extrapolationFactor: number }`.
- [x] T02.2 Define `PrintersStore = { version: number; printers: Printer[] }` and `Prefs = { skipPrerequisiteCheck: boolean }`.
- [x] T02.3 Define the axis identifiers (`X | Y | A | B`), measurement keys (outer/inner), and the in-progress `MeasurementState` shape.
- [x] T02.4 Define `ScreenId` union covering Home, ManagePrinters, all Quad screens, all Single screens.
- [x] T02.5 Define constants: `DESIGN_LENGTH_MM = 140`, `WARN_MIN_MM = 135`, `WARN_MAX_MM = 142`, `FACTOR_WARN_MIN = 0.9`, `FACTOR_WARN_MAX = 1.1`, storage keys, precision constants (5 dp / 4 dp), `STORE_VERSION = 1`.

### T03 — Storage module

**Context:** All persistence is localStorage-only (PRD §7, §15.1–§15.4). This
module isolates every read/write and all failure handling so screens never touch
localStorage directly.
**Deliverable:** `src/lib/storage.ts` with fully typed, defensive functions.
**Depends on:** T02
**Size:** M

- [x] T03.1 Implement `isStorageAvailable()` with a try/catch probe.
- [x] T03.2 Implement `loadPrinters(): { printers: Printer[]; error: boolean }` — safe JSON parse, schema validation, corrupt data ⇒ empty list + `error: true`, never deletes stored data.
- [x] T03.3 Implement `savePrinters(printers: Printer[])` returning a success flag; catch quota/write errors (PRD §15.4).
- [x] T03.4 Implement `loadPrefs(): Prefs` and `savePrefs(prefs: Prefs)` with the same safety pattern.
- [x] T03.5 Add `parseImportedPrinters(json): { printers: Printer[]; invalid: number; versionError: boolean }` that validates version + per-entry shape (PRD §15.3).

### T04 — Calculation module

**Context:** The app's core value is correct math (PRD §13). Implement it as
pure, dependency-free functions so it can be unit-tested exhaustively and reused
by both flows.
**Deliverable:** `src/lib/calc.ts`.
**Depends on:** T02
**Size:** S

- [x] T04.1 Implement `average(values: number[]): number`.
- [x] T04.2 Implement `quadExtrapolationFactor(measurements): number` = avg(all 8) / avg(X outer, X inner).
- [x] T04.3 Implement `quadCompensationRatio(measurements): number` = avg(all 8) / 140.
- [x] T04.4 Implement `singleExtrapolatedRatio(inner, outer, factor): number` = ((inner+outer)/2 / 140) × factor.
- [x] T04.5 Implement `finalShrinkagePercent(currentPercent, ratio): number` = current × ratio.
- [x] T04.6 Implement display formatters: `format5dp`, `format4dp` (rounding via `toFixed`, then trailing-zero handling as required).

### T05 — Validation module

**Context:** All input gating and warnings are specified in PRD §14. Centralize
so forms behave identically and the Continue-button gating is consistent.
**Deliverable:** `src/lib/validation.ts`.
**Depends on:** T02
**Size:** M

- [x] T05.1 `validateMeasurement(raw): { valid: boolean; warn: boolean }` — positive finite number; warn when `<135` or `>142`; no inner/outer comparison.
- [x] T05.2 `validatePercent(raw): boolean` — percentage input, `>0` and `≤1000`.
- [x] T05.3 `validatePrinterName(raw, existingNames, currentName?): { valid; error? }` — trimmed non-empty, ≤64 chars, case-insensitive uniqueness excluding the record being edited.
- [x] T05.4 `validateFactor(raw): { valid; warn }` — positive finite; warn outside `0.9–1.1`.
- [x] T05.5 Export the exact warning strings (measurement warning, factor warning, duplicate-name error) as constants.

### T06 — Asset pipeline

**Context:** Images and STLs must survive any build base path and future
embedding, so they are imported through Vite rather than referenced by absolute
URL (PRD §16).
**Deliverable:** Assets under `src/assets/` with an import map + alt-text source.
**Depends on:** T01
**Size:** S

- [x] T06.1 Copy the three root STL files into `src/assets/stl/` and the required `Documentation/Images/*` into `src/assets/img/`.
- [x] T06.2 Create `src/lib/assets.ts` exporting imported URLs for every image and STL used by the flows.
- [x] T06.3 Create an alt-text map (`Record<imageKey, string>`) derived from each image's context (PRD §16), since images carry no captions.
- [x] T06.4 Verify a production build emits the assets and that an STL `<a download>` link resolves correctly.

### T07 — Unit tests for pure modules

**Context:** Lock in correctness of storage, calculation, and validation before
UI depends on them (PRD §20.4). These are the highest-value tests in the app.
**Deliverable:** `src/lib/*.test.ts` with meaningful coverage.
**Depends on:** T03, T04, T05
**Size:** M

- [x] T07.1 Test all four calculation formulas (PRD §13) against hand-computed known inputs, including a zero-skew factor ≈1.0.
- [x] T07.2 Test rounding: 5 dp for compensation/factor, 4 dp for final percentage.
- [x] T07.3 Test measurement validation boundaries (134.99, 135, 142, 142.01, 0, negative, NaN, empty).
- [x] T07.4 Test name uniqueness (case-insensitive, self-exclusion) and factor warning bounds.
- [x] T07.5 Test storage load with valid, corrupt, and missing data; test import parse with duplicate/skipped/invalid entries and unknown version.

---

## Phase 1 — App shell, shared UI, navigation

### T08 — Root component & state

**Context:** One top-level component owns all durable state and screen switching
(PRD §8, §9). Everything else receives props/setters.
**Deliverable:** `src/App.tsx` with signals and the state API.
**Depends on:** T03
**Size:** M

- [x] T08.1 Create signals: current screen, saved printers, prefs, in-progress measurements, storage-unavailable/corrupt notices.
- [x] T08.2 On mount, load printers and prefs; surface corrupt-storage and unavailable-storage notices.
- [x] T08.3 Provide mutation helpers (`addPrinter`, `updatePrinter`, `deletePrinter`, `setPrintersFromImport`) that persist immediately and handle write failures.
- [x] T08.4 Provide `resetMeasurements()` and measurement setters used by flow screens.
- [x] T08.5 Render the active screen by `ScreenId` (switch/map), passing only the state a screen needs.

### T09 — Shared UI primitives

**Context:** A tiny set of reusable controls keeps screens consistent without
introducing a design system (PRD §17). Build only what the screens need.
**Deliverable:** `src/components/ui/*`.
**Depends on:** T01
**Size:** M

- [x] T09.1 `Button` (primary/secondary, disabled state) with correct `type` and focus styles.
- [x] T09.2 `TextField` and `NumberField` with `<label for>`, `inputmode="decimal"`, unit suffix, and inline warning/error slot.
- [x] T09.3 `Checkbox` with label association and required/disabled behavior.
- [x] T09.4 `Modal` with focus trap, Esc-to-close, backdrop handling, and `aria-modal`/labelled title.
- [x] T09.5 `StepIndicator` ("Step N of M") + progress bar.
- [x] T09.6 `Lightbox` for tap-to-zoom images with keyboard close.
- [x] T09.7 `CopyButton` with "Copied" feedback.
- [x] T09.8 `Notice`/`Banner` (info/warning) and `WarningText` (amber, non-blocking).

### T10 — App shell & styling

**Context:** Provide the page frame, load the parent stylesheet, and add only
`truss-`-prefixed local styles (PRD §19). No CSS reset output.
**Deliverable:** Shell layout + `src/styles/local.css` wired into the bundle.
**Depends on:** T09
**Size:** S

- [x] T10.1 Add a shell wrapper with a main landmark and consistent max-width/padding.
- [x] T10.2 Create `local.css`; prefix every selector with `truss-` (PRD §19).
- [x] T10.3 Import `global.css` and `local.css` from the entry so the standalone build matches the parent site.
- [x] T10.4 Confirm no CSS reset is injected and that styles are scoped enough for embedding.

### T11 — Home screen

**Context:** Home is the flow chooser and the only always-visible navigation hub
(PRD §11). It also routes to printer management and handles the zero-printer
state.
**Deliverable:** `src/pages/Home.tsx`.
**Depends on:** T08, T10, T03, T06
**Size:** S

- [x] T11.1 Render title, one-line explanation.
- [x] T11.2 Render "Quad-Beam Calibration" and "Single-Beam Calibration" option cards with the exact approved subtext (PRD §11).
- [x] T11.3 Disable Single when `printers.length === 0` and show the exact zero-printer message.
- [x] T11.4 Render "Manage saved printers" button always.
- [x] T11.5 Render GitHub and documentation icon buttons linking to the two configured URLs at the bottom.

### T12 — Navigation & exit-confirmation framework

**Context:** Flows are forward/back step machines with specific exit rules
(PRD §9, §17): Back on all but first steps; final result screens have Finish
only; any other mid-flow exit confirms.
**Deliverable:** A small navigation controller used by both flows.
**Depends on:** T08, T09
**Size:** M

- [x] T12.1 Implement `go(screenId)` and `back()` over the root screen signal.
- [x] T12.2 Implement `requestExit()` that opens the exit-confirmation modal and discards progress on confirm.
- [x] T12.3 Wire the exit modal through `Modal` with the "progress will be lost" copy; show it even when no data was entered.
- [x] T12.4 Expose a `blocked` flag for final result screens (no Back, Finish only).

---

## Phase 2 — Printer management

### T13 — Manage Printers screen

**Context:** The non-flow management page (PRD §12). Unified responsive card
layout, alphabetical ordering, empty state.
**Deliverable:** `src/pages/ManagePrinters.tsx`.
**Depends on:** T08, T10
**Size:** M

- [x] T13.1 Render printer cards: name, factor (5 dp), Edit, Delete.
- [x] T13.2 Sort alphabetically by name (case-insensitive).
- [x] T13.3 Implement the empty state message with a hint, keeping Add/Import visible.
- [x] T13.4 Layout as single column narrow, grid when wide (responsive, PRD §18).
- [x] T13.5 Render Add, Import, Export (conditional), and Back-to-home controls (Export visibility completed in T16).

### T14 — Add / Edit printer modal

**Context:** One modal serves Add and Edit (PRD §12, §14).
**Deliverable:** Modal logic inside `ManagePrinters` (or a dedicated component).
**Depends on:** T13, T05, T03
**Size:** M

- [x] T14.1 Fields: name text, factor number (required, no default); Cancel/Save.
- [x] T14.2 Disable Save until both fields are valid; show factor warning inline (non-blocking).
- [x] T14.3 Enforce case-insensitive duplicate blocking, excluding the record being edited.
- [x] T14.4 On save, call `addPrinter`/`updatePrinter` so localStorage updates immediately.

### T15 — Delete confirmation

**Context:** Destructive action needs confirmation (PRD §12).
**Deliverable:** Delete flow in the management screen.
**Depends on:** T13
**Size:** S

- [x] T15.1 Open a confirmation modal naming the printer.
- [x] T15.2 Confirm ⇒ `deletePrinter` and re-persist; Cancel ⇒ no change.
- [x] T15.3 Return focus to a sensible element after close (a11y).

### T16 — Export

**Context:** Backup path for localStorage-only data (PRD §7.3, §12).
**Deliverable:** Export action + timestamped Blob download.
**Depends on:** T13, T03
**Size:** S

- [x] T16.1 Build `{ version, printers }` from current state.
- [x] T16.2 Serialize to a Blob and download as `truss-printers-YYYYMMDD-HHmmss.json`.
- [x] T16.3 Hide the Export control entirely when the list is empty.

### T17 — Import

**Context:** Merge-only import with per-printer partial success (PRD §15.3).
**Deliverable:** Import action with inline summary.
**Depends on:** T13, T03, T05
**Size:** M

- [x] T17.1 File picker restricted to `.json`.
- [x] T17.2 Parse via `parseImportedPrinters`; reject unknown versions and malformed files with an inline error and no state change.
- [x] T17.3 On success, merge keeping existing entries on case-insensitive name conflict; skip invalid entries.
- [x] T17.4 Persist the merged list and show the summary ("Imported N, skipped N duplicate, N invalid").

### T18 — Printer management integration tests

**Context:** Verify the management screen behaviors end-to-end at the component
level before flows reuse the same storage API.
**Deliverable:** Component/integration tests + manual checklist result.
**Depends on:** T07, T14, T15, T16, T17
**Size:** M

- [x] T18.1 Test add/edit/delete update the visible list and storage.
- [x] T18.2 Test duplicate-name blocking across cases.
- [x] T18.3 Test export shape, filename pattern, and empty-list hiding.
- [x] T18.4 Test import merge/conflict/invalid/version-rejection paths and summary counts.

---

## Phase 3 — Quad (first-time) flow

### T19 — Flow scaffolding

**Context:** Shared mechanics for both flows: ordered step list, step indicator,
"Calibrating on {name}" header (PRD §17), and access to measurement state.
Both flows duplicate content intentionally (PRD §8), but may share this
non-content scaffolding.
**Deliverable:** Flow container/hook under `src/pages/quad/` used by Q1–Q9.
**Depends on:** T12, T08
**Size:** M

- [x] T19.1 Define the ordered Quad step list and compute N/M dynamically so skipping Q1 recalculates the count (PRD §10).
- [x] T19.2 Render `StepIndicator` + progress bar on every step.
- [x] T19.3 Render the printer context header (hidden until the printer is named).
- [x] T19.4 Wire Back/Continue through the T12 controller, respecting first-step and final-screen rules.
- [x] T19.5 Start the flow by calling `resetMeasurements()`.

### T20 — Q1 Prerequisites

**Context:** Hardware prerequisites + persistent skip flag (PRD §10, §7.2).
**Deliverable:** Q1 screen.
**Depends on:** T19, T03
**Size:** S

- [x] T20.1 Three checkboxes with labels from `0-Start-Here.md`.
- [x] T20.2 "Don't ask again" checkbox enabled only once all three are checked.
- [x] T20.3 Continue disabled until all three are checked; on Continue, persist `skipPrerequisiteCheck` if chosen.
- [x] T20.4 Skip this screen automatically when the flag is set (and recount steps).

### T21 — Q2 Filament tuning

**Context:** Per-filament prerequisites, always shown, never skippable (PRD §10, §12 of flow).
**Deliverable:** Q2 screen.
**Depends on:** T19
**Size:** S

- [x] T21.1 Three checkboxes (temperature / pressure advance / flow rate) with docs copy.
- [x] T21.2 Continue disabled until all three are checked.

### T22 — Q3 Slice Quad file

**Context:** Download + slicing guidance incl. seam warnings (PRD §16).
**Deliverable:** Q3 screen.
**Depends on:** T19, T06
**Size:** M

- [x] T22.1 STL download button/link for the Quad file.
- [x] T22.2 Render steps 3–5 copy and all referenced images inline (lightbox-enabled).
- [x] T22.3 Continue button.

### T23 — Q4 Print

**Context:** Printing + plate-removal guidance (PRD §16).
**Deliverable:** Q4 screen.
**Depends on:** T19, T06
**Size:** S

- [x] T23.1 Render steps 6–7 copy and images.
- [x] T23.2 Continue button.

### T24 — Q5 Locate X-beam

**Context:** Step 8 guidance (PRD §16).
**Deliverable:** Q5 screen.
**Depends on:** T19, T06
**Size:** S

- [x] T24.1 Render step 8 copy and image.
- [x] T24.2 Continue button.

### T25 — Q6 Measure X

**Context:** First measurement inputs; establishes the measurement pattern
(PRD §13, §14, §17).
**Deliverable:** Q6 screen.
**Depends on:** T19, T05, T04
**Size:** M

- [x] T25.1 Two labeled inputs: "X — Outer", "X — Inner", both in mm.
- [x] T25.2 Inline amber warning using the exact string when out of range; warning never blocks.
- [x] T25.3 Continue disabled until both inputs are valid.
- [x] T25.4 On Continue, store the two values in root measurement state.
- [x] T25.5 Render the measurement warnings/examples from step 9.

### T26 — Q7 Measure Y, A, B

**Context:** Repeat measurement for the remaining axes on one screen (PRD §10).
**Deliverable:** Q7 screen.
**Depends on:** T25
**Size:** M

- [x] T26.1 Six inputs grouped under Y / A / B headings, reusing the T25 input pattern.
- [x] T26.2 Per-field out-of-range warnings; Continue disabled until all six valid.
- [x] T26.3 On Continue, store all six values in root measurement state.

### T27 — Q8 Extrapolation factor + save printer

**Context:** Compute and explain the factor, capture and persist the printer
(PRD §13.1, §14).
**Deliverable:** Q8 screen.
**Depends on:** T26, T04, T03, T05
**Size:** M

- [x] T27.1 Compute and display the factor rounded to 5 dp.
- [x] T27.2 Include the note that this is not the filament shrinkage value and must not be entered into the slicer.
- [x] T27.3 Name input with case-insensitive duplicate blocking (excluding none).
- [x] T27.4 Save & Continue disabled until a valid, unique name is entered.
- [x] T27.5 On save, persist the printer via root state; update the context header.

### T28 — Q9 Compensation + final result

**Context:** The product's payoff screen; layout is ordered to prevent mistaking
the compensation ratio for the final value (PRD §13.2).
**Deliverable:** Q9 screen.
**Depends on:** T27, T04, T09
**Size:** M

- [x] T28.1 Instructions + `shrinkage-adjust-1.png` / `shrinkage-adjust-2.png` with lightbox.
- [x] T28.2 "Current XY shrinkage %" input, default `100`, note to copy from the slicer.
- [x] T28.3 Plain, non-emphasized sentence including the 5 dp compensation ratio.
- [x] T28.4 Prominent live-computed final value at 4 dp, plus `CopyButton`.
- [x] T28.5 Finish-only action (no Back); Finish returns Home.

### T29 — Quad flow integration

**Context:** Prove the whole first-time journey and its rules before mirroring it
(PRD §9, §20).
**Deliverable:** Integrated, tested Quad flow.
**Depends on:** T20, T21, T22, T23, T24, T25, T26, T27, T28
**Size:** M

- [x] T29.1 Walk the full flow manually and confirm calculations against PRD §13.
- [x] T29.2 Verify Q1 skip/recount behavior and persistence of the flag.
- [x] T29.3 Verify no Back on Q9 and exit-confirmation on every other step.
- [x] T29.4 Verify refresh mid-flow returns Home and discards measurements.
- [x] T29.5 Add a component test for the measurement-to-result calculation path.

---

## Phase 4 — Single (repeat) flow

### T30 — Single flow scaffolding

**Context:** Reuse T19's step machinery with the Single step list and the
selected-printer context (PRD §9, §10, §17).
**Deliverable:** Flow container under `src/pages/single/`.
**Depends on:** T19
**Size:** S

- [x] T30.1 Define the ordered Single step list (6 steps) and indicator.
- [x] T30.2 Carry the selected printer through the flow and render "Calibrating on {name}".
- [x] T30.3 Reset measurements at flow start; wire Back/Finish rules.

### T31 — S1 Select printer

**Context:** Entry point of the repeat flow (PRD §10).
**Deliverable:** S1 screen.
**Depends on:** T30, T03
**Size:** S

- [x] T31.1 Radio list of saved printers showing names only; scrollable if long.
- [x] T31.2 Continue disabled until one is selected.
- [x] T31.3 Store the selected printer in flow state for calculations and header.

### T32 — S2 Filament tuning

**Context:** Same content as Q2 (intentional duplication, PRD §8).
**Deliverable:** S2 screen.
**Depends on:** T30
**Size:** S

- [x] T32.1 Three checkboxes with docs copy.
- [x] T32.2 Continue disabled until all checked.

### T33 — S3 Slice Single file

**Context:** Single-beam slicing guidance (PRD §16).
**Deliverable:** S3 screen.
**Depends on:** T30, T06
**Size:** S

- [x] T33.1 STL download for the Single file.
- [x] T33.2 Render step 3 copy and images.
- [x] T33.3 Continue button.

### T34 — S4 Print

**Context:** Printing/removal guidance (PRD §16).
**Deliverable:** S4 screen.
**Depends on:** T30, T06
**Size:** S

- [x] T34.1 Render steps 4–5 copy and images.
- [x] T34.2 Continue button.

### T35 — S5 Measure beam

**Context:** Two measurement inputs reusing the T25 pattern and warnings
(PRD §13.3).
**Deliverable:** S5 screen.
**Depends on:** T30, T05, T04
**Size:** S

- [x] T35.1 Two labeled inputs (Outer/Inner) with warnings and gated Continue.
- [x] T35.2 Store values in root measurement state.

### T36 — S6 Extrapolated result

**Context:** Compute the extrapolated ratio from the selected printer's factor,
then show the final value using the Q9 layout (PRD §13.2, §13.3).
**Deliverable:** S6 screen.
**Depends on:** T31, T35, T04
**Size:** M

- [x] T36.1 Compute extrapolated ratio (5 dp) using the selected printer's stored factor.
- [x] T36.2 Reuse the Q9 layout: instructions/images, current-XY input, non-emphasized ratio sentence.
- [x] T36.3 Prominent live-computed final value (4 dp) + `CopyButton`.
- [x] T36.4 Finish-only action returning Home.

### T37 — Single flow integration

**Context:** Verify the repeat journey and its dependency on saved printers
(PRD §9, §20).
**Deliverable:** Integrated, tested Single flow.
**Depends on:** T31, T32, T33, T34, T35, T36
**Size:** M

- [x] T37.1 Walk the full flow with a seeded printer and confirm the extrapolated value.
- [x] T37.2 Verify header shows the selected printer and Finish returns Home.
- [x] T37.3 Verify exit confirmation and measurement reset behavior.
- [x] T37.4 Add a component test for single-measurement → extrapolated result.

---

## Phase 5 — Cross-cutting quality & release

### T38 — Accessibility pass

**Context:** Meet the a11y baseline from PRD §18 across all screens.
**Deliverable:** A11y fixes + verification notes.
**Depends on:** T11, T13, T18, T29, T37
**Size:** M

- [x] T38.1 Audit labels/`for` associations, headings order, and landmark structure.
- [x] T38.2 Verify modal focus trap, Esc close, and focus restoration.
- [x] T38.3 Verify keyboard-only operation of every flow and the management screen.
- [x] T38.4 Verify lightbox keyboard close and alt text presence on all images.
- [x] T38.5 Check color contrast against `global.css` tokens.

### T39 — Responsive / mobile pass

**Context:** Usable down to ~360px (PRD §18).
**Deliverable:** Responsive fixes + verification at target widths.
**Depends on:** T11, T13, T18, T29, T37
**Size:** M

- [x] T39.1 Verify all flow screens at 360px, 768px, and desktop widths; fix overflow/clipping.
- [x] T39.2 Verify printer cards single-column → grid behavior.
- [x] T39.3 Verify measurement input grouping remains readable on mobile.
- [x] T39.4 Verify tap targets and the image lightbox on touch.

### T40 — End-to-end acceptance verification

**Context:** Validate the deliverable against every acceptance criterion in
PRD §20 (and unit coverage from T07).
**Deliverable:** Signed-off acceptance checklist.
**Depends on:** T07, T18, T29, T37, T38, T39
**Size:** M

- [x] T40.1 Verify AC1–AC4 (zero-printer home, full Quad, persistence, formula correctness).
- [x] T40.2 Verify AC5–AC8 (warnings, duplicate rejection, export, import).
- [x] T40.3 Verify AC9–AC11 (corrupt/unavailable storage, keyboard/mobile, exit confirmation).
- [x] T40.4 Record any deviations and open follow-up tasks if needed.

### T41 — Build & deployment configuration

**Context:** Produce the standalone artifact that matches PRD §19 and remains
embeddable-safe.
**Deliverable:** Configured, reproducible production build.
**Depends on:** T01, T40
**Size:** S

- [x] T41.1 Confirm `base: '/'`, single-bundle output, and that `global.css` is loaded in the standalone `index.html`.
- [x] T41.2 Run `pnpm build` and `pnpm preview`; verify assets, STL downloads, and routing (refresh → Home) in the built app.
- [x] T41.3 Confirm no runtime network requests and no CSS reset output.
- [x] T41.4 Document the deploy target (static host at subdomain root).

### T42 — Release v1 & handoff docs

**Context:** Close the project with run/build documentation and a final graph
check.
**Deliverable:** Updated `truss-webui/README.md` + release record.
**Depends on:** T41
**Size:** S

- [x] T42.1 Document install/dev/build/preview commands and the storage keys/export format.
- [x] T42.2 Confirm all tasks above are checked, every dependency satisfied, and no orphan tasks remain.
- [x] T42.3 Tag/record v1 against `ai-context/PRD.md` and `ai-context/implementation-plan.md`.

---

## Verification matrix (task → PRD section)

| Task | Primary PRD reference |
|---|---|
| T02–T05 | §6, §7, §13, §14 |
| T03, T17 | §7, §15 |
| T07 | §13, §14, §20.4 |
| T08, T12 | §8, §9 |
| T09, T10, T17 | §16, §17, §18, §19 |
| T11 | §11 |
| T13–T18 | §12, §15.3 |
| T19–T29 | §10, §13, §14, §17 |
| T30–T37 | §10, §13, §17 |
| T38, T39 | §18 |
| T40 | §20 |
| T41, T42 | §19 |
