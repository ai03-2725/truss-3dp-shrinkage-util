# PRD — Truss Calibrator Webapp

**Status:** Draft v0.1
**Scope:** v1
**Related:** `ai-context/starting-prompt.md`, `ai-context/flow-outline.md`, `Documentation/0-Start-Here.md`, `Documentation/1-Quad-Calibration.md`, `Documentation/2-Single-Calibration.md`

---

## 1. Problem

The Truss Calibrator produces accurate filament shrinkage ratios, but using it requires the user to follow three written guides, perform averaging and division by hand, and correctly chain those results into a slicer setting. The math is simple but unforgiving: an arithmetic slip produces a plausible-looking number near `0.98` that the user then encodes permanently into a filament profile.

## 2. Product summary

A guided, step-by-step webapp that walks the user through either calibration flow, collects measurement values, performs all arithmetic, and hands back a slicer-ready value. It also stores per-printer extrapolation factors so subsequent calibrations can be done from a single-axis print.

The app is a **calculator with a printer-factor store**, not a record keeper.

## 3. Goals

1. Eliminate manual arithmetic entirely, replacing it with a verified implementation of the documented procedure.
2. Guide the user through the correct sequence with the guidance (and visuals) needed at each step, so no separate document must be open alongside it.
3. Make repeat calibrations fast by persisting printer extrapolation factors and applying them automatically.
4. Function standalone *and* embedded in a parent website without modification, routes, or configuration.

## 4. Non-goals (explicit)

| Non-goal | Rationale |
|---|---|
| Calibration history / results log | App is a calculator; no per-calibration records are kept. |
| Filament profiles / per-filament storage | Only printer factors persist. The user re-enters the slicer's current value each run. |
| Cloud sync, accounts, multi-device storage | No server. Portability is served by JSON export/import. |
| Direct slicer integration | No plugin, no profile file writes. The value is handed to the user. |
| Analytics / telemetry | Explicitly excluded. Handled data is measurement data about user hardware. |
| Dual/other model variants | Axis count and math undocumented; the calculation engine is shape-specific. |
| Localization | Deferred, not closed off. Strings centralized so extraction stays cheap. |
| PWA / installable | Deferred, not closed off. Service worker scope belongs to the host page's origin. |

---

## 5. Users and usage contexts

Two distinct moments, plausibly on different devices:

1. **At the printer** — measuring with calipers, phone likely.
2. **At the slicer** — entering the resulting value, desktop near-certain.

**Device support: desktop-first, mobile must not break.** No horizontal scroll at phone widths, usable tap targets, touch-keyboard-friendly decimal entry. Because the clipboard does not cross devices, the final value must remain legible and transcribable by eye rather than existing only behind a copy button.

---

## 6. Technical constraints

### 6.1 Distribution and embedding

- Delivered as a **custom element**, `<truss-calibrator>`, mounted in a parent page.
- **Fully zero-config:** no attributes, no events, no imperative API. Asset base and storage keys are fixed at build time.
- **No routing.** The app never touches the URL, never manipulates history, and never deep-links. All navigation is internal state. Browser Back must not be relied upon for step navigation — the in-flow Back control is the only backward navigation.
- Accepted cost: the parent page receives no completion/exit signal.

### 6.2 Styling

- **Shadow DOM, fully self-contained.** The app defines its own tokens inside the shadow root and deliberately does not inherit the parent site's theme, so it renders identically standalone and embedded.
- Consequence: parent selector-based rules **cannot** reach the app. The rule in `starting-prompt.md` — "add reusable styles to `global.css`" — does not apply to anything selector-based. `src/styles/**` is the app's private stylesheet set, bundled into the shadow root.
- `::part()` remains available if the parent ever needs an explicit styling hook.

### 6.3 Asset delivery

The three STLs live at the repo root and match the guides' link names exactly:

| File | Size |
|---|---|
| `Truss Calibration Beam Single.stl` | 281K |
| `Truss Calibration Beam Dual.stl` | 482K (unused, see non-goals) |
| `Truss Calibration Beam Quad.stl` | 981K |

- Delivered by **build-time copy** from the repo root into the app's static assets (gitignored, so copies cannot drift). Repo root remains the single source of truth.
- **Hard requirement:** asset URLs must resolve relative to the app's **own script URL** (`import.meta.url`-style), never the page or domain root. Root-absolute URLs such as `/Truss%20Calibration%20Beam%20Quad.stl` break whenever the app is embedded under a sub-path. This must be covered by a build-configuration test.
- Images are delivered the same way. `Documentation/Images` measures **38MB across 31 files, 28 referenced**, with individual files up to 2.7MB — resize and re-encode for display width rather than shipping originals.

### 6.4 Browser floor and accessibility

- Last two versions of Chrome, Edge, Firefox, Safari.
- Accessibility is a functional requirement, not an intention:
  - Every input labelled; warnings/errors programmatically associated with their field.
  - On step transition, focus moves to the new step's heading (the view is replaced wholesale, so without this, keyboard and screen-reader users are stranded on a destroyed element).
  - Warnings are announced via a live region — a visually-inline warning is invisible to assistive tech otherwise.
  - Full keyboard-only operation; `prefers-reduced-motion` respected; focus behavior correct at the shadow boundary (`delegatesFocus`).

---

## 7. Data model

Namespaced local storage keys, versioned payloads:

```
truss-calibrator:v1:printers   -> { "version": 1, "printers": [ { "name": ..., "extrapolationFactor": ... } ] }
truss-calibrator:v1:settings   -> { "version": 1, "skipPrerequisites": true|false }
```

**Printer record**

| Field | Type | Rules |
|---|---|---|
| `name` | string | Trimmed. **Identity.** Unique, case-insensitive. Non-empty. |
| `extrapolationFactor` | number | Finite, positive. Derived from a quad calibration. |

- Name is the identity; there is no hidden ID. Exported JSON stays human-readable and hand-editable.
- **Precision:** full float precision is stored and used for all computation. Display rounding never feeds back into computation.

**Versioning scheme (T03.2, final).** The version appears twice, deliberately:

1. In the key name — `truss-calibrator:v1:…` — a coarse namespace. A future incompatible change ships as `v2`, which leaves `v1` data untouched and readable rather than silently reinterpreted.
2. In the payload — `"version": 1` — the authoritative per-record check. A reader that does not recognise the payload version treats the value as *unreadable* (see §12: treated as empty, raw string retained for export).

A key-name/payload version mismatch is a corruption case, not a migration case: nothing consumes it as data. **These key names are frozen at first ship.** Renaming them later orphans every user's stored printers, which is why they are settled here rather than at the point of first storage.

---

## 8. Calculations

### 8.1 Canonical form

Both flows are the same computation with a different measurement basis:

$$R = F \times \frac{\text{basis}}{140} \qquad \text{final \%} = \text{current slicer value} \times R$$

- Quad flow: $F$ is computed from the measurements, and the basis is that calibration's own X average.
- Single flow: $F$ is the stored printer factor, and the basis is the two measured values.

The guides phrase the quad flow as $\bar v_8 / 140$ and the single flow as $(\bar v_2 / 140) \times F$. These are algebraically identical — multiplication commutes. **The implementation must use one canonical order** (compute the extrapolated average, then divide by 140) so the two flows cannot drift apart.

**Quad flow**

$$\bar v_8 = \frac{1}{8}\sum_{i=1}^{8} v_i \qquad \bar v_X = \frac{v_{X,outer} + v_{X,inner}}{2} \qquad F = \frac{\bar v_8}{\bar v_X} \qquad R = \frac{\bar v_8}{140}$$

**Single flow**

$$\bar v_2 = \frac{v_{outer} + v_{inner}}{2} \qquad \bar v_{extrapolated} = \bar v_2 \times F \qquad R = \frac{\bar v_{extrapolated}}{140}$$

### 8.2 Rounding

Display values are **rounded half-up** (not truncated — this deliberately departs from the outline's wording, which biases every displayed value downward, and the displayed value is what the user retypes into their slicer):

| Value | Places |
|---|---|
| Extrapolation factor | 10 |
| Shrinkage compensation ratio | 5 |
| Final slicer percentage | 3 *(settled — see §13.1)* |

Computation always uses full precision. The final percentage is **not** derived from the displayed ratio.

### 8.3 Validation rules

**Blocking** (Next/Save disabled, field-level error): empty, non-numeric, `≤ 0`, non-finite.

**Non-blocking warning** (inline, field-associated, does not block progression):

| Condition | Why |
|---|---|
| Measurement outside ~133–138.6mm | Designed length is 140mm and documented shrinkage is 0.95–0.99; outside this is almost certainly a misread or wrong unit. |
| Divergence > **2.0mm** between the inner and outer reading of one axis, **in either direction** | Suggests the caliper was seated wrong — the guides warn this yields a bogus diagonal reading. The size of the gap is what matters: which reading is the larger of the two is not evidence of a misread, so the warning must not depend on it. *(Settled — see §13.2.)* |

**Why 2.0mm for the divergence threshold.** The inner and outer readings of one axis differ by exactly the sum of the two end-wall thicknesses shown in the design — a fixed geometric quantity, not a shrinkage-dependent one, so the same absolute threshold is valid for every material. The shipped designs put that sum well under 1mm, and the worked fixtures in §14.1 use legitimate divergences up to 1.0mm. A divergence above 2mm is therefore not reachable by a correctly seated caliper on any of the three designs, while 2mm sits comfortably above every legitimate case so the warning cannot fire on a good measurement and train the user to ignore it.

---

## 9. Screens and flow

### 9.1 Landing screen

Entry point. Offers:
- Enter the calibration flow
- Edit saved printer data

*Exact copy and whether it links the canonical documentation: open item (§13).*

### 9.2 Common section

**C1 — Prerequisites checklist.** Three checkboxes, matched to `0-Start-Here.md`:
1. A decent modern pair of digital calipers (needs ≥150mm range; no drift across repeated measurements)
2. A functional, calibrated printer (build plate ≥150×150mm)
3. A modern slicer

Next is gated on all three. A "Don't ask again" checkbox becomes available once all three are ticked; when set, it is persisted as a **single global flag** (`skipPrerequisites`) and C1 is skipped on subsequent runs.

The flag is **set and cleared from a checkbox on the printer-data screen** — not from the landing page. This is the only path back to the checklist content, so the toggle must be discoverable there.

**C2 — First time on this printer?** Yes → Quad flow. No → Single flow.

If **no printers are saved**, the Single-flow option is **disabled** with this exact copy:

> No printers saved - run a first-time calibration first or import saved printer profiles.

A secondary button opens the printer-data screen. Leaving the flow here is lossless (nothing has been measured), so **no exit confirmation** is shown. Returning from the printer-data screen always lands on the **landing page**; the user re-enters the flow.

### 9.3 Quad calibration flow (first-time)

Content is authored fresh for the flow; source steps are noted for reference.

| Step | Content | Gating |
|---|---|---|
| Q1 | Filament prerequisites: temperature, pressure advance/flow dynamics, flow rate. *(guide step 1)* | Next gated on 3 checkboxes |
| Q2 | Slice the Quad STL. Download button + guidance on seam placement off measurement surfaces. *(guide steps 3–5)* | Confirm-sliced |
| Q3 | Print. Warning: do not force off the plate; cool fully; do not measure on the plate. *(guide steps 6–7)* | Confirm-printed |
| Q4 | Locate the X-beam (X label). *(guide step 8)* | Next |
| Q5 | Measure X — one section per dimension, each ordered CAD diagram → real-world photograph → field. The general seating warnings lead the page; the inner-jaws correct/incorrect guidance sits *inside* the inner section, between its photograph and its field. *(guide step 9)* | 2 valid values |
| Q6 | Measure Y, A, B — outer and inner each, as a compact table of beams (rows) against sides (columns). Does **not** repeat step 5's guidance or figures. *(guide step 10)* | 6 valid values |
| Q7 | Compute and display $F$ (rounded to 10dp). The user names the printer; a name already in use blocks Next while it is typed, and **Next is the save** — there is no separate button. *(guide step 12)* | Non-empty, unused name |
| Q8 | Results screen (§10). Slicer adjustment instructions. **No Back** (Q7 has already written the printer record) and **Finish replaces Next**: it ends the flow and returns to the landing screen. **No Cancel** either — a second way out, arriving with a confirmation in front of it, is a chance to press the wrong one. *(guide step 11)* | Finish |

**Navigation:** Back + Next across all steps, with a single in-memory calibration draft shared by every step (so Back is free and Next validates). **No mid-flow persistence** — closing or reloading restarts at step 1.

**Exit confirmation:** shown when the user leaves the flow after entering at least one measurement and before completing it (i.e. Q5/S5 onward). Steps C1–C2 and Q1–Q4 exit without confirmation. Both flows' results screens (Q8, S6) are the exception on both counts: they offer no Cancel control, and their Finish control is the success path, so it returns to the landing screen without asking. The engine's rule is unchanged — *any* exit request still confirms — those steps simply no longer offer the control that requests one.

### 9.4 Single calibration flow (fast)

| Step | Content | Gating |
|---|---|---|
| S1 | Select a saved printer (name + factor). | Selection |
| S2 | Filament prerequisites. | Next gated on 3 checkboxes |
| S3 | Slice the Single STL; seams off measurement faces. *(guide step 3)* | Confirm-sliced |
| S4 | Print + cooling warning. *(guide steps 4–5)* | Confirm-printed |
| S5 | Measure X — outer and inner, with full seating guidance. *(guide step 6)* | 2 valid values |
| S6 | Results screen (§10) with the extrapolated value. **Finish replaces Next**: it ends the flow and returns to the landing screen, and **there is no Cancel** — a second way out, arriving with a confirmation in front of it, is a chance to press the wrong one. *(guide step 7)* | Finish |

Same navigation and exit-confirmation rules as the quad flow, including no Back on the results screen: S6 is the last step, and Finish is the way out of it.

---

## 10. Results screen

**Hero: the slicer-ready percentage**, formatted for the slicer's field, with copy-to-clipboard. Because the clipboard does not cross devices, the digits are also displayed large and adjacent — transcription by eye must be viable.

The screen first asks for the slicer's **current XY shrinkage value** (defaults to `100%`), then multiplies it by the computed ratio. Input is validated as positive with soft warnings outside a plausible band.

**Secondary details block** (not the primary action):

| Quad flow | Single flow |
|---|---|
| Average of all 8 measurements | The 2 measurements |
| X average | Their average |
| Extrapolation factor (10dp) | Stored extrapolation factor |
| Shrinkage compensation ratio (5dp) | Extrapolated average |
| | Shrinkage compensation ratio (5dp) |

The factor is deliberately visible here: a user who skipped saving (or hit unavailable storage) can still transcribe it into a printer record manually.

---

## 11. Printer data screen

Lists all saved printers — name and extrapolation factor — and supports add, modify, delete, export, import.

- **Sort order:** alphabetical, case-insensitive *(proposed — §13)*.
- **Add:** manual entry of name + factor, for users porting data in. The factor field carries an inline warning that the value should come from a quad calibration and that single-flow results are extrapolated from whatever is stored.
- **Modify:** name and factor are both editable; the factor field carries the same inline warning. *(Editable rather than read-only: delete-and-re-add is the alternative, and manual add already legitimizes typed factors.)*
- **Delete:** irreversible; requires confirmation *(copy — §13)*.
- **Prerequisites reset** lives here (§9.2).

### 11.1 Export

`truss-printers-YYYY-MM-DD.json`:

```json
{
  "version": 1,
  "printers": [
    { "name": "X1C", "extrapolationFactor": 1.0034215686 }
  ]
}
```

**Numbers are written at full precision**, never the 10-decimal display value — otherwise every round trip would silently degrade stored factors.

### 11.2 Import

**Merge by name; existing values always win.** Import only adds printers whose names do not already exist; conflicts are skipped and reported with a count.

Validation is **all-or-nothing**: invalid JSON, unexpected shape, unsupported version, or any record with a missing/invalid name or factor causes the entire import to be refused with a specific reason. A partially-applied import is worse than a refused one.

**Accepted consequence:** restoring an *older* backup over damaged current data is impossible without first deleting the conflicting records. This must be stated in the UI, not discovered by the user.

### 11.3 Export payload scope

Printer data only. The `skipPrerequisites` flag is app state, not printer data, and is not included.

---

## 12. Failure modes and accepted limitations

Storage is treated as unreliable:

| Failure | Behaviour |
|---|---|
| Storage unavailable (`localStorage` throws — private browsing, disabled site data) | Fail soft. App runs on an in-memory store with a persistent "changes won't be saved" banner. The **mandatory save gate is skipped as unsatisfiable**, since it can never succeed; the factor is still displayed so the user can write it down. |
| Quota exceeded | Same in-memory fallback + banner. |
| Corrupt or foreign payload | Treated as empty, but **the raw string is preserved for export** rather than silently overwritten — import cannot restore it (existing-wins), so destroying it would be unrecoverable. |

**Accepted limitation — name collision at the save gate.** A collision is a hard block, surfaced as the user types: **Next stays disabled** until the typed name is free, so there is no failed save to recover from. Reusing an existing name is therefore impossible from inside the flow; a user who wants to must Exit → delete the record from the printer-data screen → restart the flow, **losing all eight measurements**. The inline warning names the way forward — choose another name — rather than presenting a dead end, because nothing has failed: the user has simply not finished naming the printer.

**Accepted limitation — no mid-flow recovery.** Closing the tab mid-flow discards all entered measurements by design.

---

## 13. Open items

Status legend: **Closed** = decided and recorded here and in the section that owns it; **Deferred** = carried into the task that owns the screen.

1. **Final percentage precision — Closed (T03.1). 3 decimal places.**
   OrcaSlicer's field is `filament_shrink`, labelled "Shrinkage (XY)": a percentage stored as a double with a declared range of 50–150 and no representable-precision ceiling, so 3dp is storable. Of the two candidate values, 3dp is chosen because 2dp would round away up to 0.005% (≈0.007mm over a 140mm beam) *at the moment the value is handed to the slicer*, which is precisely the class of silent degradation this app exists to remove. 3dp is the finest precision that is still physically meaningful: 0.001% is ≈0.0014mm over the beam, an order of magnitude below the 0.01mm caliper resolution, so it adds fidelity without implying accuracy the measurement does not have. The guides' `98.7%` example is an illustrative 1dp rounding, not a constraint.
2. **Inner/outer divergence threshold — Closed (T03.3). 2.0mm.** Rationale in §8.3.
3. **Image optimization targets — Closed (T03.4).** Long edge capped at **1400px** (2× the 700px maximum content width defined by `global.css`, so the largest figure is crisp on a 2× display and never upscaled); aspect ratio preserved; **WebP quality 82** for everything, with the original file retained when the WebP is not smaller (protects small flat-colour diagrams); alpha preserved. **No `srcset`:** one 1400px asset is served to every display density and CSS constrains its display size, which keeps the markup and the copy step simple and still removes ~95% of the 38MB. Files are referenced by name from `src/assets/manifest` rather than by glob so an unreferenced image cannot silently ship.
4. **Landing screen copy** — closed in T17.
5. **Prerequisites reset control** — closed in T22.
6. **Printer list sort order** and delete-confirmation copy — closed in T18 and T21.
7. **Storage key naming — Closed (T03.2).** `truss-calibrator:v1:printers` and `truss-calibrator:v1:settings`, frozen. Versioning scheme in §7.

---

## 14. Success criteria

Success is defined as **verifiable correctness and task completion**, not instrumentation — analytics is a non-goal, so completion rates and drop-off are unavailable by design.

Acceptance requires all of:

1. **Numeric parity with the documented manual procedure**, via golden-value fixtures whose expected outputs are hand-computed independently of the implementation.
2. Both flows completable end-to-end on desktop, and usable at mobile widths.
3. Correct behaviour on every documented edge case: empty printer list, storage unavailable, name collision, invalid input, corrupt payload, refused import.

A wrong value is worse than no app, and the failure mode here is quiet: a mis-implemented averaging or extrapolation step still yields a plausible number near `0.98`. Fixtures must therefore be derived independently — a test that re-asserts the implementation's own arithmetic proves nothing.

### 14.1 Worked fixtures

**Fixture A — degenerate quad.** All eight values `137.50`.

- $\bar v_8 = 137.50$, $\bar v_X = 137.50$, $F = 1.0$ exactly
- $R = 137.50/140 = 0.9821428571\ldots$ → 5dp `0.98214`
- With a current slicer value of `100%`: `98.214285…%` → 2dp `98.21`, 3dp `98.214`

**Fixture B — non-trivial factor, exercises the rounding tie.** Measurements:

| Axis | Outer | Inner |
|---|---|---|
| X | 138.00 | 137.00 |
| Y | 137.00 | 136.50 |
| A | 138.20 | 138.00 |
| B | 137.60 | 137.40 |

- $\bar v_8 = 1099.70/8 = 137.4625$; $\bar v_X = 137.50$
- $F = 137.4625/137.50 = 0.9997272727$ (10dp, repeating)
- $R = 137.4625/140 = 0.981875$ exactly → 5dp rounds **up** to `0.98188` (tie case; truncation would give `0.98187`, so this fixture pins the rounding rule)
- With `100%`: `98.1875%` → 2dp `98.19`, 3dp `98.188`

**Fixture C — cross-flow equivalence.** Using Fixture B's printer ($F = 0.9997272727$) in the single flow with measurements `137.60 / 137.40`:

- $\bar v_2 = 137.50$ — deliberately equal to Fixture B's $\bar v_X$
- $\bar v_{extrapolated} = 137.4625$, $R = 0.981875$ → `0.98188`

The single flow must reproduce the quad flow's result exactly when its basis equals that calibration's X average. This is the test that proves the extrapolation model is implemented consistently across both flows.

---

## 15. Decision log

| # | Decision |
|---|---|
| 1 | No mid-flow persistence; reload restarts at step 1. |
| 2 | Back + Next navigation over one shared in-memory draft; Exit confirmed once measurements exist. |
| 3 | Soft validation: block invalid input, warn (non-blocking) on implausible values. |
| 4 | "Don't ask again" = single global flag; reset lives on the printer-data screen. |
| 5 | Printer identity = unique user-chosen name; no hidden ID. |
| 6 | Import merges by name; existing values always win; all-or-nothing on invalid files. |
| 7 | Full precision internally; round half-up for display (deviates from the outline's "truncate"). |
| 8 | Slicer-ready percentage is the hero; ratio and factor in a secondary details block. |
| 9 | Outline's ordering retained: factor → mandatory save gate → shrinkage result. |
| 10 | Name collision at the save gate is a hard block — Next stays disabled while the typed name is taken (limitation documented in §12). |
| 11 | STLs delivered by build-time copy from repo root; base-relative URLs only. |
| 12 | Dual variant out of scope. |
| 13 | Shadow DOM, fully self-contained styling; parent theming not inherited. |
| 14 | Custom element is fully zero-config; no attributes or events. |
| 15 | Storage failure = fail soft, with the save gate skipped as unsatisfiable. |
| 16 | Quick flow disabled when no printers are saved, with a route into the printer-data screen. |
| 17 | Printer-data screen always returns to the landing page. |
| 18 | Export = versioned JSON array of records, full-precision numbers. |
| 19 | Saved printers are editable (name + factor) with an inline warning on the factor. |
| 20 | Desktop-first; mobile must not break. |
| 21 | All flow prose authored fresh; all existing doc images reused, optimized. |
| 22 | Modern evergreen browsers; accessibility built into the flow. |
| 23 | Non-goals: history, filament profiles, sync, slicer integration, analytics. |
| 24 | Localization and PWA deferred, not closed off. |
| 25 | Success = numeric parity with the manual procedure + end-to-end completion. |
| 26 | Q5 is one section per dimension, each ordered diagram → photograph → field, so the visual context precedes the number it describes and the inner-jaws guidance sits inside the inner section rather than above both. Q6 does not repeat the guidance or figures; the three remaining beams are entered in a table of beams against sides. |
| 27 | Q7 has no save button: **Next writes the printer**, so a name can never be reported as taken while its record already sits in storage. A duplicate disables Next as the user types, and Q8 has no Back, since the factor it shows is already saved under the name Q7 wrote. |
| 28 | Neither flow has a separate "Finished" step: the results screen's control is **Finish**, which returns to the landing screen without a confirmation, and it is drawn as an outline rather than the filled Next — it leaves the flow rather than advancing through it. Those steps are the end of the flow, so Back and Cancel are hidden there too: several controls that all leave, one of them asking a question first, is a chance to press the wrong one. |
