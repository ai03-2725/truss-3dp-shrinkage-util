# Truss Calibrator Web App — Product Requirements (v1)

## Purpose

Turn the existing manual Truss Calibrator instructions into a guided web app. Users print a calibration beam, enter caliper measurements, and receive a filament XY shrinkage value and the percentage to enter in their slicer. The app also saves a printer-specific extrapolation factor so later filaments can be calibrated with a faster Single-beam print.

The source of truth for the printing and measurement instructions is `README.md` and `Documentation/`. `ai-context/flow-outline.md` and `ai-context/project-structure.md` provide the initial flow and implementation constraints; decisions in this PRD supersede them where they differ.

## Goals and scope

- Guide users through a full Quad calibration for a new **or previously saved** printer, and a quick Single calibration for a saved printer.
- Include the instructions, cautions, diagrams, and photos needed to complete either process **inside the app**; users should not need to consult the manual guides.
- Calculate results automatically while keeping all calculations at full available precision.
- Persist printer profiles, the active calibration, and the equipment-prerequisite skip preference locally in the browser. Provide printer management and JSON import/export.
- Run both as a standalone web app and embedded in a host page, on desktop and mobile.

Out of scope for v1: Dual-beam calibration; filament profiles or a history of calibration results (the user's slicer stores per-filament settings); accounts, a backend, analytics, or transmission of user data. An internet connection may be required to load the app and its assets.

## Users and entry points

The user has a suitable printer, slicer, and digital calipers as described in `Documentation/0-Start-Here.md`. The home screen offers:

1. **Quad calibration (Full):** described primarily as first-time printer calibration, with a secondary note that it also recalibrates an already saved printer.
2. **Single calibration (Quick):** available when at least one printer is saved. If none is saved, do not enter the flow; explain that the user should first run Quad calibration or import printers through the management screen. Do not offer manual factor entry here.
3. **Manage printers:** edit, delete, add, import, and export profiles; manage the equipment-prerequisite skip preference.

## Guided flows

### Quad calibration

1. Confirm the three equipment prerequisites: suitable digital calipers, a functional/calibrated printer, and a suitable slicer. Each has a checkbox; all must be checked to continue. Once satisfied, the user can choose **Don't ask again** to skip this screen on later Quad runs. The preference is also editable from Manage printers.
2. Confirm filament preparation with checkboxes for temperature settings, pressure advance/flow dynamics, and flow rate; all must be checked to continue.
3. Provide the Quad STL download and the guide's slicer instructions, including the measurement-face seam warnings and relevant images.
4. Guide printing, cooling, and careful removal from the build plate.
5. Help the user locate the labeled X beam.
6. Explain and illustrate outer and inner caliper measurements, including force, alignment, top-entry, and correct/incorrect inner-jaw positioning. Collect X outer and inner lengths.
7. Collect Y, A, and B outer and inner lengths, clearly labeled by axis and measurement type. Include the instructions and visual guidance needed to measure them correctly.
8. Compute the printer's extrapolation factor and ask for its name. Warn immediately if the name matches an existing profile. On an attempt to continue with a duplicate, require a confirmation dialog explaining that the old factor will be overwritten and that this should be done only when recalibrating that printer. Save the new profile when the user proceeds.
9. Show the Quad shrinkage value and ask for the slicer's **current** XY shrinkage percentage (default 100%). Show the updated percentage and the existing OrcaSlicer/Bambu Studio instructions for applying it, noting that users of other slicers must adapt the instructions. **Finish** returns home and clears active calibration state.

### Single calibration

1. Select a saved printer.
2. Confirm temperature, pressure advance/flow dynamics, and flow-rate preparation as in the Quad flow.
3. Provide the Single STL download and in-app slicing and seam instructions.
4. Guide printing, cooling, and removal.
5. Explain and illustrate both outer and inner X measurements with the same relevant cautions and correct/incorrect positioning details as Quad; collect both lengths.
6. Show the extrapolated shrinkage value, collect the current slicer XY percentage (default 100%), show the updated percentage, and explain how to apply it in OrcaSlicer/Bambu Studio. **Finish** returns home and clears active calibration state.

Use the wording and illustrations from `Documentation/1-Quad-Calibration.md` and `Documentation/2-Single-Calibration.md` wherever practical. The app should include their substantive details rather than reducing critical measurement guidance to links. V1 offers no special zero-skew path: every printer uses the same Quad factor calculation and Single flow, even when the factor is close to 1.

### Navigation and resuming

- Users can go back through pre-result steps to correct inputs; preserve entered values. Once the Quad profile is saved and its final result screen is reached, **Back is unavailable** so previous measurements cannot change without updating the saved factor. For consistency, Back is also unavailable on the Single final result screen.
- An explicit **Exit** action asks for confirmation before leaving a flow. Confirmed exit clears its step, inputs, and progress; cancel keeps the flow intact. Finish clears the active calibration without deleting saved printer profiles.
- Save the active flow, current step, partially entered fields, and checkbox states **as they change**. Reopening the app or refreshing the page automatically resumes the unfinished flow, including partially completed steps. A user must explicitly exit or finish to clear it.

## Calculations and input rules

All beam lengths are in millimeters; the designed measurement length is **140 mm**. Use full available numeric precision for calculations and stored/exported factors. Do not round a factor to 1, apply a skew threshold, or otherwise adjust the result.

- `quadAverage = average(X outer, X inner, Y outer, Y inner, A outer, A inner, B outer, B inner)`
- `xAverage = average(X outer, X inner)`
- `printerFactor = quadAverage / xAverage`
- `quadShrinkage = quadAverage / 140`
- `singleShrinkage = (average(X outer, X inner) × savedPrinterFactor) / 140`
- `recommendedXYPercent = currentXYPercent × applicableShrinkage`

Display the shrinkage value rounded to **up to 10 decimal places as needed**, without unnecessary trailing zeroes. Display the recommended XY percentage rounded to **four decimal places** for entry into slicers. Display rounding must not affect subsequent calculations or saved factors.

- Length inputs require a finite, positive number. Missing, non-numeric, zero, and negative values block continuation. Accept any decimal precision, using a **period** as the decimal separator. A value below **135 mm** or above **142 mm** triggers a non-blocking warning in **both** flows. If the inner and outer measurements of any beam differ by **more than 0.4 mm**, warn the user on that beam's input screen to recheck the measurements and prior filament tuning; do not block continuation or repeat this warning on the final result screen.
- Current XY percentage defaults to **100%** and requires a finite, positive number. A value below **90%** or above **110%** triggers a non-blocking warning; the result on that screen still updates.
- Manually added or edited extrapolation factors are required (no default) and must be finite and positive. Values below **0.9** or above **1.1** trigger a non-blocking warning.

## Saved printers and data portability

A printer profile contains **only its name and full-precision extrapolation factor**; do not save its original Quad measurements or a calibration date as part of the profile. Printer names must be non-empty after trimming whitespace. Trim names and compare them case-insensitively for duplicates, including during import; retain a usable display name.

Manage printers provides a list/table of names and factors; add and edit controls for both values, with the factor required when adding a printer manually; delete with confirmation; export; and import. Do not allow an edit or manual add to create a duplicate name. At the bottom, provide a toggle for the equipment-prerequisite skip preference.

Export all saved profiles in a JSON file with this v1 shape (using the actual full-precision values):

```json
{
  "version": 1,
  "printers": [
    { "name": "P1S", "extrapolationFactor": 1.002 }
  ]
}
```

Import requires a supported version, a list of profiles, unique non-empty names within that list, and finite positive numeric factors. Reject the **entire file** with a clear error if its JSON or any imported record is invalid; reject unsupported versions. If a valid file contains names already saved locally, keep the local profiles, skip those imported profiles, import the remaining profiles, and report the **count and names** skipped. Import/export transfers printer profiles only, not the active calibration or skip preference.

Standalone and embedded deployments may each have their own browser storage; cross-origin synchronization is not required. Users can transfer profiles by export/import.

## Storage failure

If local storage is unavailable or a write fails, do not prevent calibration. Warn clearly that progress and profiles may not survive closing or refreshing the app and recommend resolving the storage issue. Keep profiles usable in memory for the current open session, including in export, where practical.

Normally **hide the printer extrapolation factor on the Quad result screen** to avoid confusion with the filament shrinkage value. When the Quad profile cannot be saved, instead show its full-precision factor and explicitly ask the user to note it down manually. Continue to show the filament shrinkage value and recommended slicer percentage normally.

## Platform and presentation

- Use Solid.js and the existing Vite starter. Avoid path-based routing: the app must work when embedded on a host page without controlling its URL.
- Images and STL downloads must work independently of the host page's URL path; do not assume assets are available at the website root. Use only the Quad and Single STLs in v1.
- Support responsive desktop, phone, and tablet layouts. Target current Chrome, Firefox, Safari, and Edge, including mobile Chrome and Safari.
- Target **WCAG 2.2 AA**, including keyboard-operable flow navigation and dialogs, labeled inputs, accessible warnings/errors, and usable images and diagrams.
- Use the provided styling and follow `ai-context/project-structure.md`'s simple, screen-oriented structure and embedded-style constraints. Avoid abstractions or dependencies added only for speculative future requirements.
- User data remains in the browser; this app has no accounts, backend data submission, or analytics.

## Release acceptance

- A user can complete Quad calibration, save a new printer, or deliberately overwrite an existing one after confirmation, and obtain the correct full-precision-derived shrinkage and rounded slicer percentage.
- A user with a saved or imported printer can complete Single calibration using its factor; a user without one cannot enter Single calibration and sees the stated alternatives.
- Refreshing or reopening mid-flow restores the current step and partially entered values; confirmed Exit and Finish clear active progress but retain saved profiles.
- Invalid inputs block where specified; unusual but valid lengths, inner/outer differences over 0.4 mm, percentages, and manually added or edited factors show non-blocking warnings.
- Edit/delete, versioned JSON import/export, case-insensitive conflicts, whole-file rejection on invalid import, and skipped-name reporting behave as specified.
- When storage fails, calibration still works and the unsaved Quad factor is available for manual recording; when storage works, the factor is hidden from the Quad result.
- Instructions and images are available inside both flows, and downloads work in both standalone and embedded deployments.
- Automated tests cover formulas and output formatting, import validation/conflicts, and persistence/resume/clear behavior. Manually verify guided flows and responsive behavior on supported desktop/mobile browsers, plus accessibility against the stated target.
