# Truss Calibrator Web App — English/Japanese UI

## Purpose

Add English and Japanese UI support to `truss-webui/` without changing the calibration experience. Users can choose a language at any point; the app remembers an explicit choice in this browser and otherwise follows the browser's preferred languages. The Japanese copy will be translated manually after the implementation milestone and **before public release**.

This update covers the app UI, not website metadata or translation of the underlying calibration data. The existing English app is the behavioral baseline.

## Required behavior

### Language selection and persistence

- Support English (`en`) and Japanese (`ja`) now, with a straightforward way to add another supported language later. Do not add speculative locale features or a translation service.
- On initial load, use a valid, previously saved manual selection if present. Otherwise, check the browser's ordered preferred-language list and choose the **first supported** language. Match regional variants by base language (for example, `ja-JP` → Japanese and `en-US` → English). If none is supported, use English. A missing or unusable preference must not prevent the app from loading.
- A manual selection applies immediately and takes precedence on future visits. Store it in browser storage separately from calibration progress and printer profiles. Do not include it in printer JSON exports/imports, and do not change their format.
- If browser storage is unavailable, language selection still works for the current open session. It need not persist after a refresh; no additional warning about the lost language preference is required. Keep existing storage-failure behavior for progress and printer profiles.
- Render the resolved language from the first app view rather than briefly showing English before changing. Update the document's `lang` attribute on load and on selection so assistive technology uses the appropriate language.

### Switching experience

- Offer a language control on **every screen**: alongside the existing link icons on Home, and beside the Home or Exit control on About, Manage printers, every calibration step, and result screens. A globe icon button using the existing Phosphor icon style, opening a compact popover with a language selector, is the preferred design; an equally accessible treatment fitting the current styling is acceptable.
- Label the choices by their native names, **English** and **日本語**, in either UI language. Selecting one should apply it without a separate Save action. The control and selector must work with keyboard, touch, and screen readers, including an accessible name and usable focus/dismissal behavior.
- Switching mid-calibration keeps the **same step, all measurements, checkboxes, selections, progress, and saved profiles**; only the UI language changes. Refresh/resume, Back, Exit, and Finish retain their existing behavior. Switching language must not accidentally clear or save a calibration or printer profile.
- Already-visible validation errors, warnings, and status messages should change language immediately, without repeating the action that produced them. Unsaved text in an open printer-editing dialog does **not** need to survive a language switch; the user may close the dialog before switching.

### Copy and authoring

- Cover **all user-facing app text** in both languages: Home, About, Manage printers, Quad and Single flows, result screens, shared controls, progress labels, dialogs, import/export feedback, storage warnings, validation messages, copy/zoom status, form labels, image captions and alt text, tooltips, and accessible names/announcements. Include messages originating in shared components or non-UI helper code; avoid mixed-language screens when translations are complete.
- Provide separate **page-like TSX copy/content for each language** so the maintainer can translate formatted paragraphs in context, including emphasis, links, code, and figures. A language's content may reorder or adjust presentation **within a screen**, including use of images and links. Keep the same functional screens, step order, required inputs, validation rules, calculations, navigation, persisted data, and downloads for both languages. Share functional behavior rather than maintaining divergent copies of calibration logic. Organize short shared-component and dynamic messages for straightforward manual translation as well.
- The implementation milestone may populate Japanese content with English copies as placeholders, including UI messages outside pages. Japanese must still be selectable and exercise the full switching path. **Completed Japanese copy across the app is a separate public-release requirement**; placeholder English is not considered a finished Japanese release.
- Reuse existing instructional images for both languages for now, even when screenshots contain English text. Allow language-specific copy/figure choices later, but translated image assets are not required in this update.

### Visual and accessibility quality

- Make the existing responsive UI usable with Japanese: appropriate font fallback, line wrapping, and sufficient room for translated headings, controls, progress display, popover, and long-form instructions on narrow screens. The maintainer will review individual translated passages as they are written. Keep the existing look and feel and accessibility expectations for dialogs, forms, warnings, and images.
- Keep all numeric entry and output behavior unchanged for both languages: period decimal separator, current precision and percentage formatting, units, calculation formulas, and input validation. Translate surrounding explanations and error text, not the numeric conventions.

## Out of scope

- Automatic translation, a backend, accounts, URL-based locale routing, and language synchronization across separate browser storage contexts.
- Localizing `index.html` title, description, social-preview metadata, site manifest, or other non-app metadata. The dynamic document `lang` attribute **is** in scope for accessibility.
- Translating existing instructional images, downloaded STL/JSON filenames, user-entered printer names, or printer JSON keys/content. Do not alter saved data or import/export compatibility.
- New calibration steps, different behavior per language, or locale-specific number parsing/formatting.

## Acceptance criteria

### Implementation milestone (English placeholders permitted)

- With no manual choice, an ordered browser preference list such as `fr-FR, ja-JP, en-US` starts in Japanese; `fr-FR, en-US, ja-JP` starts in English; an unsupported-only list starts in English. A stored manual choice wins over each list and survives refresh when storage works.
- Both languages are selectable from every screen. Switching on a partially completed Quad or Single step preserves the step, inputs, and progress; switching back and refreshing retain the expected state. Printer management and JSON import/export continue to work unchanged.
- App copy, accessibility labels, and dynamic messages are covered by the locale structure, including already-displayed errors/warnings; Japanese placeholders can still read in English at this stage. The document language reflects the selected locale. Storage-blocked sessions remain usable without an added language-preference warning.
- Shared behavior stays identical for both languages; page-like content can be independently edited/reordered without duplicating calibration rules. Existing automated tests/build continue to pass. Add focused automated checks for locale resolution, saved-choice precedence, and storage-unavailable behavior; manually exercise both calibration flows and a visible-error language switch.
- Check the selector, wrapping, keyboard interaction, and basic screen-reader labels at desktop and mobile widths on current mainstream evergreen browsers, particularly desktop Chrome/Safari and mobile Chrome/Safari.

### Before public release

- Replace Japanese English placeholders with manually reviewed Japanese UI copy, including shared controls, dynamic messages, accessible text, and figure captions/alt text. Review each screen and representative error, dialog, and result state in both languages; check Japanese layout at mobile and desktop widths. Existing images may remain English.
