# i18n copy inventory and boundary map

Deliverable for implementation-plan task 1. Source of truth: [PRD.md](./PRD.md).

## 1.1 Baseline (recorded before any change)

From `truss-webui/`:

- `pnpm test` → 33 tests, 33 pass, 0 fail (calc, flow, printers, storage, image generation).
- `pnpm build` → succeeds (tsc + vite).

Pre-existing failures: none.

State ownership traced:

- `src/App.tsx` owns all durable state (`printers`, `skipEquipment`, `active`) and the
  `view`/`exitConfirmOpen` UI state. Loads synchronously via `storage.load(browserStorage())`
  so the first render resumes the saved screen. `screen()` is a memo of `active()?.step ?? view()`.
- `src/lib/storage.ts` owns the `truss-calibrator-v1` key, sanitizing, load/save, and the
  storage warning string.
- `src/lib/app-api.ts` is the interface every screen receives (`AppApi`).
- `src/pages/quad.tsx` / `src/pages/single.tsx` are the flow screens. They remount whenever
  Solid's `<Switch>` swaps the active `Match`; a locale signal change does **not** change
  `screen()`, so screens are not remounted by a language switch, only re-rendered.
- Persisted progress must stay independent of locale. The locale has its own storage key.

## 1.2 Localization surfaces

Legend: **M** = short message/prop (locale-specific message module), **C** = page-like TSX
content (independently editable per locale), **K** = keep as-is (data/numeric/identifier).

### Shared components

| File | Text / surface | Kind |
| --- | --- | --- |
| `components/FlowFrame.tsx` | `Step X of Y`, `Calibration progress` aria, `Exit calibration` aria, `Back`, `Next` | M |
| `components/ConfirmDialog.tsx` | `Cancel`; title/message/confirmLabel come from callers | M |
| `components/NumberField.tsx` | unit suffix (mm, keep), error/warning come from callers | K/M |
| `components/BeamFields.tsx` | default `Outer measurement` / `Inner measurement` labels; invalid/range/gap warnings | M |
| `components/ResultPercent.tsx` | `Updated XY shrinkage percentage to use:`, `Copy`, `Copied!`, `Could not copy the value`, clipboard announcements; `—`/`%` are numeric | M |
| `components/Guide.tsx` | `Enlarge image:` aria (parameterized by alt); `MeasurementWarnings`; `InnerJawGuidance` (formatted, `<strong>`, lists); `Figure` captions/alt are passed by callers | M + C |
| `components/Lightbox.tsx` | `Zoom in`/`Zoom out`/`Reset`/`Reset zoom`/`Close`/`Close enlarged image` | M |
| `components/Icon.tsx` | SVG only | K |

### Pages

| Screen | Copy surfaces | Kind |
| --- | --- | --- |
| Home | heading, subtitle, 4 card titles/bodies/actions, disabled-Single note, GitHub/ai03 link aria+title | C (plus 2 link aria in M) |
| About | long-form prose, lists, figure alt/captions, storage note | C |
| Manage printers | intro, empty note, table caption/columns/data-label, Add/Edit/Delete/Export/Import, preference, dialogs, import error/skipped | C + M (dynamic) |
| Quad equipment/filament | prose + formatted checklist labels | C |
| Quad slice/print/locate | rich instructions, STL label, figure alt/captions, cautions | C |
| Quad X/Y/A/B | prose, legends, existing-value summary, figure alt/captions | C + M (BeamFields) |
| Quad name/result | intro, name field, duplicate/overwrite text, result advice, warnings | C + M |
| Single printer/filament | picker copy + tuning prose | C |
| Single slice/print | STL label, instructions, figures | C |
| Single measure | prose, legends, guide note | C + M |
| Single result | result explanations, missing-printer error, warnings | C + M |

### Non-UI helpers returning English text

- `src/lib/printers.ts`: `validateName`, `validateFactor`, `importJSON` return English
  `error` strings. → replace with stable error identifiers + params, translate on render (task 5.2).
- `src/lib/storage.ts`: `STORAGE_WARNING`, malformed/malformed messages. → identifiers.
- `src/lib/calc.ts`: no user-facing strings.
- `ResultPercent` already tracks status as a code (`idle`/`copied`/`failed`), keep that.

### Must remain unchanged (K)

Numeric formats (`parsePositiveDecimal`, period separator, `formatShrinkage`/`formatPercent`
precision), units, printer names, printer JSON keys/content and `version`, export filename
`truss-printers.json`, STL download filenames, step IDs, validation rules, storage key
`truss-calibrator-v1`, and site metadata in `index.html`.

## 1.3 Copy boundaries / architecture

- **Supported locales**: `en`, `ja`; resolver and persistence in `src/lib/locale.ts`.
- **Reactive locale**: `AppApi.locale` / `AppApi.setLocale`, owned by `App.tsx`.
- **Short shared messages**: `src/lib/messages.ts` — a `messages(locale)` lookup for all
  reusable labels, aria text, progress text, dialog button labels, BeamFields/ResultPercent
  copy, and formatted-error renderers keyed by stable error codes.
- **Page-like content**: `src/pages/<locale>/<Screen>.tsx`, one file per screen per locale.
  - Each content component receives shared state/callbacks (from `AppApi`) and derived
    values as **props**; it never owns calibration logic or state.
  - The existing `src/pages/*.tsx` files become thin containers that compute functional
    values and render the locale-selected content inside shared `FlowFrame` chrome.
  - Reordering paragraphs/figures within a screen is allowed; step order, required inputs,
    validation, calculations, navigation, persisted data, and downloads stay shared.
- **Dynamic errors**: stored as named codes + params (e.g. `{ code: 'nameDuplicate', name }`),
  rendered through `messages(locale)` so an already-visible error updates on switch.
- Japanese content starts as exact English placeholders; Japanese copy is task 9.
