# PRD — Truss Shrinkage Calibrator Webapp

Status: Draft v1
Companion references: `starting-prompt.md`, `flow-outline.md`, `project-structure.md`, `/Documentation/*`, `README.md`

---

## 1. Overview

The Truss Shrinkage Calibrator is a 3D-printed tool for calibrating filament shrinkage on a 3D printer. A user prints a truss beam, measures it with calipers, and derives a shrinkage compensation value to enter into their slicer's per-filament XY shrinkage setting.

Today this is a fully manual process: the user follows the written documentation in `/Documentation` and performs all arithmetic by hand. This project is a webapp that guides the user through the process step by step and performs all calculations automatically, eliminating the need to read the documentation or use a calculator.

The app is built with SolidJS + Vite (scaffold already present under `/truss-webui`) and is designed to run both standalone and, in a future phase, embedded as an Astro island.

## 2. Problem statement

- The calibration math (averages, extrapolation factor, compensation ratio, final percentage) is easy to fumble manually and easy to mix up across 8 measurements.
- The step-by-step knowledge lives in long-form markdown, which novices must read and re-read.
- There is no built-in record of a printer's extrapolation factor, which is required for the fast repeat calibration.
- Users need a quick, trustworthy path from "I printed the beam" to "here is the number to type into my slicer."

## 3. Goals & success criteria

### Goals
- Guide a novice through a full Quad-beam calibration without opening any `/Documentation` file and without any manual math.
- Guide an experienced user through a fast Single-beam repeat calibration with the same clarity, without skipping important steps.
- Persist a printer's extrapolation factor for future repeat calibrations.
- Keep the implementation intentionally simple: minimal state, minimal abstraction, no router, few shared components.

### Success criteria
- A first-time user can complete a Quad calibration end-to-end — including saving the printer and receiving a final XY shrinkage percentage to enter into the slicer — using only the app.
- The app never assumes prior knowledge; the experienced (Single) path still carries complete instructional copy, differing only in step count.
- All calculations are performed automatically and are correct per Section 13.
- Saved printers survive page reloads and can be exported/imported for backup.
- The app remains embeddable (no path-based routing, scoped CSS, base-path-safe assets).

## 4. Non-goals / out of scope (v1)

- Building/shipping the Astro wrapper site (worked on separately, no timeline). The app must merely remain embeddable.
- Internationalization. English-only. i18n is deferred because the app is copy-heavy and translations may fundamentally change page layout/ordering (see Section 23).
- Accounts, backend, cloud sync, analytics, telemetry.
- Any calibration beyond shrinkage (temperature, pressure advance, flow rate remain external prerequisites the app only prompts for).
- Any per-printer "zero skew" flag or branch (see Section 13.5).
- A UI to reset the "Don't ask again" preference.
- Print/QR/share-result features.

## 5. Target users

- **Novice:** owns a 3D printer and the printed Truss calibrator; comfortable with a slicer but has never used the Truss before and does not want to read markdown or do math.
- **Experienced:** has calibrated one or more printers with the Truss before; wants the fastest possible repeat calibration, but should still be shown the full guided flow so nothing important is missed.

## 6. Glossary

| Term | Meaning |
|---|---|
| **Measurement** | A single caliper reading in millimeters. Inner and outer readings are independent; which is larger is not guaranteed. |
| **Extrapolation factor** | Printer-specific factor `avg(8 measurements) / avg(X inner, X outer)`. Predicts what a Quad average would be from a Single-beam measurement. ~1.0 when skew is negligible. |
| **Compensation ratio** | `measured average / 140` (≈0.95–0.99). Computed for a single beam or an extrapolated Quad. **Not** the value entered into the slicer. |
| **Calculated filament XY shrinkage** | `current XY % × compensation ratio`. The final value the user enters into the slicer's XY shrinkage field. |

## 7. Data model & persistence

All state is client-side. No network requests at runtime.

### 7.1 Saved printers
```jsonc
// localStorage key: "truss-calibrator.printers.v1"
{
  "version": 1,
  "printers": [
    { "name": "Bambu P1S", "extrapolationFactor": 1.02345 }
  ]
}
```
- `name` is the primary key / uniqueness constraint. Uniqueness is **case-insensitive**; the stored casing is preserved.
- No ids or timestamps.
- `extrapolationFactor` is stored with **full precision** and only rounded for display.
- The list is loaded at app start and re-saved to localStorage immediately on every mutation (add / edit / delete / import).

### 7.2 Preferences
```jsonc
// localStorage key: "truss-calibrator.prefs.v1"
{ "skipPrerequisiteCheck": true }
```

### 7.3 Exported JSON
```jsonc
{ "version": 1, "printers": [ { "name": "...", "extrapolationFactor": 1.02345 } ] }
```
- Filename includes a timestamp to keep multiple downloads distinguishable, e.g. `truss-printers-YYYYMMDD-HHmmss.json`.
- Generated in-memory as a Blob and downloaded; no server involved.

## 8. Application architecture

- A single top-level SolidJS component is the entry point and state manager. It owns:
  - the current-screen signal (no router),
  - the in-progress measurement signal (reset at the start of each flow),
  - the saved-printer list signal (loaded at startup, re-persisted on change),
  - the "Don't ask again" preference,
  - setters passed to child screens.
- Screens are mostly self-contained page components that display root state, derive calculations from it, and update it via setters. They may hold only transient local state (current typed inputs, modal open/closed, temporary edit values).
- Single and Quad flows duplicate shared steps rather than abstracting them, to keep screens predictable and independently editable.
- No path-based router (required for embedding).
- Single bundle; no code-splitting / lazy routes.

## 9. Navigation & state lifecycle

- **Home screen is the flow chooser.** There is no intermediate "start calibration" page.
- **Back:** every step has a Back action except the first step of a flow. **Final result screens (Q9, S6) have no Back** — Finish is the only action.
- **Mid-flow exit:** leaving a flow (e.g. Home) from any step *except* the final result screens shows a confirmation modal warning that progress will be lost. This appears even if no data has been entered.
- **Refresh/reopen:** returns to the Home screen and discards in-progress measurements (no router, in-memory state).
- **Starting a flow:** always clears measurement state; prior abandoned data is never retained.
- **Printer persistence timing:** Q8 saves the printer when Save & Continue is pressed; because Q9 cannot go Back, the printer entry is already durable.

## 10. Screen inventory

**Quad flow (first-time):**
| # | Screen | Notes |
|---|---|---|
| Q1 | Prerequisites (Start-Here) | Calipers / printer / slicer checkboxes + "Don't ask again". Skippable. |
| Q2 | Filament tuning | Temperature / pressure advance / flow rate checkboxes. |
| Q3 | Slice Quad file | STL download + steps 3–5 info/images. |
| Q4 | Print | Steps 6–7 info/images. |
| Q5 | Locate X-beam | Step 8 info/images. |
| Q6 | Measure X | 2 inputs (outer + inner). |
| Q7 | Measure Y, A, B | 6 inputs (outer + inner per axis), single screen. |
| Q8 | Extrapolation factor + save printer | Name input; saves printer. |
| Q9 | Compensation + final result | Current XY % input; Final value; Finish. |

**Single flow (repeat):**
| # | Screen | Notes |
|---|---|---|
| S1 | Select saved printer | Radio list of saved printers. |
| S2 | Filament tuning | Same as Q2. |
| S3 | Slice Single file | Step 3 info/images. |
| S4 | Print | Steps 4–5 info/images. |
| S5 | Measure beam | 2 inputs. |
| S6 | Extrapolated compensation + final result | Current XY % input; Final value; Finish. |

Step indicator shows **"Step N of M"** plus a progress bar. If Q1 is skipped via the preference, both N and M recalculate (M becomes 8) so the count is honest.

## 11. Home screen

- Title/branding: "Truss Shrinkage Calibrator"; one-line explanation of what it does.
- Two primary options:
  - **Quad-Beam Calibration** — subtext: "Runs a full calibration.\nStart here if you've never used Truss Calibrator on the printer you will be using." → Quad flow.
  - **Single-Beam Calibration** — subtext: "Runs a rapid calibration.\nUse this if you've already run the quad-beam calibration on the printer you will be using." → Single flow.
- **Zero saved printers:** Single-Beam option is visibly **disabled** with the message: "No saved printers available - Run a quad-beam calibration first or import printers manually."
- **Manage saved printers** button/link is always visible.
- Bottom of the home screen: two icon buttons linking to
  - the GitHub repository landing page (`https://github.com/ai03-2725/truss-3dp-shrinkage-util`), and
  - the documentation landing page (`https://github.com/ai03-2725/truss-3dp-shrinkage-util/tree/main/Documentation`).
- No separate footer elsewhere; credits live in the README reachable via the GitHub link.

## 12. Manage Saved Printers screen

- **Layout:** unified responsive card layout (not a table). Single column on narrow screens, grid on wider viewports. Each card shows the printer name, its extrapolation factor (displayed rounded to 5 dp), and Edit/Delete actions.
- **Ordering:** alphabetical by name, case-insensitive.
- **Empty state:** message such as "No saved printers yet" with a hint to run a Quad calibration; Add and Import remain available.
- **Add printer:** button always visible; opens the same modal as Edit with empty fields.
- **Add/Edit modal:** name text field + extrapolation-factor number field; Cancel/Save. Validation per Section 14. Duplicate names (case-insensitive, excluding the record being edited) are blocked inline.
- **Delete:** confirmation modal; on confirm, remove and persist immediately.
- **Export:** button downloads `truss-printers-<timestamp>.json` (Section 7.3). **Hidden when the list is empty.**
- **Import:** file picker for `.json`. Validation and merge rules per Section 15.3. After processing, show an inline summary (e.g. "Imported 3, skipped 1 duplicate, 1 invalid") without leaving the page.
- **Back to home** action.

## 13. Calculations & number formatting

All intermediate math uses **full-precision** entered measurements and stored factors. Rounding applies only to user-facing displays.

1. **Quad extrapolation factor** = `avg(all 8 measurements) / avg(X_inner, X_outer)`. Stored full precision; displayed rounded to 5 dp on Q8 and in the printer list.
2. **Quad compensation ratio** = `avg(all 8 measurements) / 140`. Displayed rounded to 5 dp.
3. **Single extrapolated compensation ratio** = `(avg(single inner, outer) / 140) × extrapolationFactor`. Displayed rounded to 5 dp.
4. **Final calculated filament XY shrinkage** = `entered current XY % × compensation ratio`. Displayed rounded to **4 dp** (slicers round/limit to ~4 dp themselves). Live-updates as the current-XY input changes.
5. `.toFixed(n)`-style rounding is acceptable (true truncation is not required).
6. **No per-printer zero-skew flag/branch.** A zero-skew printer's factor is ≈1.0, so always multiplying is effectively correct. This is an intentional simplification and is documented behavior.

### 13.1 Q8 layout
- Explain the extrapolation factor and **show its value** (5 dp).
- Include a note that this is **not** the filament shrinkage value and must **not** be entered into the slicer.
- Name input + Save & Continue.

### 13.2 Q9 / S6 layout (deliberately ordered to avoid mistaking the compensation ratio for the final value)
1. Instructions + `shrinkage-adjust-1.png` / `shrinkage-adjust-2.png` to locate the slicer XY shrinkage field.
2. Input "current XY shrinkage %" (default `100`) with a note to enter the value found in the slicer.
3. A plain, non-emphasized sentence: *"Based on the above and a calculated compensation ratio of [compensation ratio], your calculated filament XY shrinkage is"* — the compensation ratio is shown but never bolded/emphasized.
4. The **final value**, rounded to 4 dp, shown prominently as the number to type into the slicer, with a **copy-to-clipboard** button and "Copied" feedback.
5. Finish (returns Home). No Back.

## 14. Validation rules

| Field | Rule |
|---|---|
| Measurements (all axes) | Positive number required; reject empty, non-numeric, zero, negative. **Soft warning** (non-blocking) if `< 135` or `> 142`. No inner-vs-outer comparison. |
| Out-of-range warning text | "Your entered value is quite far from the expected 140mm target - please ensure that you are measuring the part correctly." |
| Slicer "current XY shrinkage %" | Percentage only (accepts e.g. `100`, not `1.0`); must be `> 0` and `≤ 1000`; defaults to `100`. Result shown raw (rounded per 13.4); not clamped relative to 100. |
| Printer name | Non-empty after trim; max 64 chars; case-insensitive uniqueness. No character restrictions (non-English names allowed). |
| Extrapolation factor (manual add/edit) | Required positive number; no default. Non-blocking warning if outside `0.9–1.1`. |
| Checkbox screens | Continue disabled until every required checkbox is checked. |

Continue/Next is **disabled until all required inputs on the screen are valid**. No additional "required field" error messaging is used; the disabled button plus inline hints suffice.

## 15. Error handling & robustness

### 15.1 Corrupt stored printers
On parse or schema failure: treat the printer list as empty for the session, show a non-blocking notice (e.g. "Saved printers couldn't be read"), **do not delete** the bad data. Recovery is possible via manual export/import.

### 15.2 localStorage unavailable
If localStorage is blocked/unavailable: the app runs fully in memory for the session and shows a warning banner that printer saves won't persist.

### 15.3 Import validation
- Require a known numeric `version` and an array `printers`. **Reject future/unknown versions** with a clear inline error and change nothing.
- Per printer entry: require non-empty string name and finite positive factor; skip and count invalid entries.
- On name conflict (case-insensitive), **keep the existing printer** and skip the incoming one.
- Merge is **per-printer (partial success allowed)**.
- If the whole file is malformed, reject with an inline error and change nothing.

### 15.4 Quota / write failure
Catch write errors and surface a notice; do not crash.

### 15.5 Offline
The app is fully functional offline. Assets are bundled; there are no runtime network calls.

## 16. Content, assets & copy

- **Copy:** reuse `/Documentation` text as closely as possible; keep warnings/instructions **verbatim** where they still apply. Rewrite only what the flow requires (e.g. "Note these two values down" → "enter them below"). New transitional copy matches the docs' voice.
- **Images:** include **every** image referenced by the source steps (including correct/incorrect measurement examples). No captions — surrounding text must make the image self-explanatory.
- **Alt text:** meaningful alt text derived from image content and context, for accessibility.
- **Lightbox:** images open in a tap-to-zoom lightbox.
- **Assets:** images and the three STL files are imported through the bundler (Vite `import` URLs) so paths remain base-path-safe; `public/` holds only `favicon.svg` and `icons.svg`. STL downloads use `<a href={url} download>`.

## 17. UX/UI conventions

- **Progress:** "Step N of M" + progress bar on every flow screen.
- **Context header:** during a flow, show "Calibrating on {printer_name}" (Single flow always; Quad flow once the printer is named).
- **Buttons:** Back (bottom-left where allowed); Continue/Next disabled until valid; Finish on result screens.
- **Modals:** Add/Edit printer, Delete printer, and Exit-confirmation. Keyboard-operable with focus trap and Esc to close.
- **Warnings:** inline, amber, non-blocking, adjacent to the field.
- **Checkboxes:** vertically stacked, labels taken from the docs.

## 18. Responsive, accessibility & browser support

- Usable down to ~360px width; single-column on narrow screens; full-width inputs; printer cards collapse to one column and expand to a grid when wide.
- Semantic HTML, `<label for>` associations, keyboard-operable modals with focus management, `aria-*` where appropriate, contrast inherited from `global.css`.
- Modern evergreen browsers (Chrome/Edge/Safari/Firefox); ES2020 target.
- English-only. No dark-mode toggle (theme-agnostic; inherits `global.css`).

## 19. Build & deployment

- SolidJS + Vite + TypeScript under `/truss-webui`.
- Standalone deployment at the subdomain root (`/`), so Vite `base` is `/` and absolute asset URLs are acceptable — but bundler-imported assets are preferred so embedding under a subpath remains possible later.
- `global.css` is applied by the parent site and must also be loaded by the standalone `index.html` for consistency. Additional reusable styles go in `global.css`; project-specific styles go in `local.css` with all classes/IDs prefixed `truss-`.
- The app must not generate CSS resets or otherwise conflict with the parent.
- Astro island embedding is **out of scope for v1** but the design constraints (no router, scoped CSS, base-path-safe assets) are honored now.

## 20. Acceptance criteria (definition of done)

1. From a clean browser (no saved printers), Home shows Single **disabled** with the specified message and a route to Manage Saved Printers.
2. A user can run the full Quad flow, entering 8 valid measurements, name and save a printer, receive a 4-dp final XY shrinkage value, and copy it — without any back-navigation past Q9.
3. Reloading the page preserves the saved printer; the Single flow then lists it and computes the extrapolated result correctly.
4. All formulas in Section 13 produce correct values for known inputs (verified against manual calculation).
5. Out-of-range measurements show the exact warning text but do not block Continue.
6. Duplicate/case-variant printer names are rejected on save and on manual add/edit.
7. Export produces the versioned JSON with a timestamped filename and is hidden when empty.
8. Import merges per-printer, keeps existing entries on conflict, skips invalid entries, rejects unknown versions, and reports a summary.
9. Corrupt stored data degrades gracefully without data loss; unavailable localStorage shows the warning banner and the app still works in memory.
10. The entire app is operable via keyboard and usable on a ~360px-wide viewport.
11. Exiting any non-result step prompts a confirmation and discards progress on confirm.

## 21. Risks & limitations

- **Extrapolation validity:** the factor is only valid while printer skew is unchanged. The app cannot detect skew changes; re-running Quad is the only correction. (Stated in docs.)
- **Wall vs infill:** the calibrator is walls/near-zero infill; results may differ if infill shrinks very differently. (From README limitations.)
- **LocalStorage-only:** clearing browser data loses saved printers; no cross-device sync. Export/import is the backup path.
- **User measurement technique:** accuracy depends on the user following the caliper instructions; the app can only warn, not verify.
- **No backend:** no analytics, no recovery beyond local storage/export.

## 22. Future work

- Astro island wrapper and embedding.
- i18n (deferred due to layout implications of translated copy).
- Optional sync/accounts.
- Optional per-printer zero-skew flag if real-world need emerges.
- UI to reset the "Don't ask again" preference.

## 23. Open questions

- None blocking. Items intentionally deferred: i18n, embedding, sync, reset-preference UI.
