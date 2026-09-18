import { createMemo, createSignal, For, onMount, Show, untrack, type JSX } from 'solid-js'
import { IMAGES, STL, STL_DOWNLOAD_NAMES, type ImageKey } from '../assets/urls'
import {
  CHECKS,
  chooseExclusively,
  isChecked,
  setChecked,
  setMeasurement,
  setPrinterName,
  type CalibrationDraft,
} from '../domain/draft'
import { evaluateQuad } from '../domain/math'
import { formatFactor } from '../domain/number'
import { type AxisId } from '../domain/types'
import { fieldWarnings } from '../domain/validation'
import type { FlowEngine } from '../flow/engine'
import { FLOW_DEFINITIONS, flowOf, type RegisteredStep } from '../flow/registry'
import type { PrinterRepository } from '../storage/printers'
import type { SettingsStore } from '../storage/settings'
import { announce } from './a11y'
import { CheckboxGroup, MeasurementField, StepChrome, type CheckboxItem } from './flow-ui'
import { ResultsStep } from './results'

/**
 * The step screens (T24–T32).
 *
 * Copy is authored fresh for the flow (decision 21) rather than pasted from the
 * guides: the guides are written to be read start to finish, and a step that has
 * already been reached does not need to re-explain what came before it. The
 * *images* are the documentation's own, reused (T11) so the pictures and the
 * written guide continue to match.
 *
 * Each screen states its own content; navigation, gating, focus and the exit
 * confirmation are the chrome's business, so no screen can get them wrong.
 */

export interface StepScreenProps {
  readonly step: RegisteredStep
  readonly engine: FlowEngine
  readonly printers: PrinterRepository
  readonly settings: SettingsStore
}

export function StepScreen(props: StepScreenProps): JSX.Element {
  const draft = () => props.engine.draft()

  /** Progress within the flow's instructional steps; the shared steps show none. */
  const progress = () => {
    if (props.step.id === 'C1' || props.step.id === 'C2') {
      return null
    }
    const definition = FLOW_DEFINITIONS[flowOf(props.step.id)]
    const instructional = definition.steps.filter((id) => id !== 'C1' && id !== 'C2')
    const index = instructional.indexOf(props.step.id)
    return index === -1 ? null : { position: index + 1, total: instructional.length }
  }

  const update = (change: (current: CalibrationDraft) => CalibrationDraft): void => {
    props.engine.updateDraft(change)
  }

  /**
   * Leave the step.
   *
   * Q7's Next *is* its save. There is no second button because there is no state
   * for one to act on: the moment the name is usable, saving and continuing are
   * the same act. The old screen had both, so a user who saved and then pressed
   * Next for the *next* printer re-filled a name that was now taken and was told
   * their new name collided — while the factor it had already written sat in
   * storage. One button cannot disagree with itself.
   */
  const advance = (): void => {
    if (props.step.id === 'Q7' && !savePrinter()) {
      return
    }
    props.engine.next()
  }

  /** Write the named printer at Q7; reports whether leaving is now safe. */
  const savePrinter = (): boolean => {
    // Nothing can be stored, and Q7 has already skipped its gate as
    // unsatisfiable (PRD §12, decision 15).
    if (props.printers.storage.degraded().degraded) {
      return true
    }

    const result = evaluateQuadOrNull(draft())
    const name = (draft().printerName ?? '').trim()
    if (result === null || name === '') {
      return false
    }

    const written = props.printers.add({ name, extrapolationFactor: result.factor })
    if (!written.ok) {
      /*
       * The gate already established that the name is free, so this is only
       * reachable if something moved underneath it — another tab taking the name
       * between the last keystroke and the press. Closing the gate puts the
       * reason on screen instead of leaving Next apparently inert.
       */
      update((current) => setChecked(current, CHECKS.printerNameReady, false))
      return false
    }

    announce(
      written.value.persisted
        ? `Saved ${name}.`
        : 'This browser could not store the printer — write the factor down from the next screen.',
    )
    return true
  }

  const content = (): JSX.Element => {
    switch (props.step.id) {
      /* ---- Common section (T24, T25) ---------------------------------- */
      case 'C1':
        return <PrerequisitesStep draft={draft()} update={update} settings={props.settings} />
      case 'C2':
        return (
          <BranchStep
            draft={draft()}
            update={update}
            printers={props.printers}
            onOpenPrinters={() => props.engine.goToPrinters()}
          />
        )

      /* ---- Quad instructional steps (T26) ----------------------------- */
      case 'Q1':
      case 'S2':
        return <FilamentPrerequisitesStep draft={draft()} update={update} />
      case 'Q2':
        return <SliceStep design="quad" draft={draft()} update={update} />
      case 'S3':
        return <SliceStep design="single" draft={draft()} update={update} />
      case 'Q3':
        return <PrintStep design="quad" draft={draft()} update={update} />
      case 'S4':
        return <PrintStep design="single" draft={draft()} update={update} />
      case 'Q4':
        return <LocateBeamStep />

      /* ---- Measurement steps (T27, T31) ------------------------------- */
      case 'Q5':
      case 'S5':
        return (
          <MeasureStep
            axes={['X']}
            draft={draft()}
            update={update}
            design={flowOf(props.step.id)}
          />
        )
      case 'Q6':
        // Deliberately not `MeasureStep`: step 5 has just shown the seating
        // guidance and the photographs, and repeating them here would be the
        // same page one step later. What is left is the six values.
        return <MeasureTableStep axes={['Y', 'A', 'B']} draft={draft()} update={update} />

      /* ---- Save gate (T28) ------------------------------------------- */
      case 'Q7':
        return (
          <FactorSaveStep
            draft={draft()}
            update={update}
            printers={props.printers}
            storage={props.printers.storage}
          />
        )

      /* ---- Quick flow's printer picker (T31) -------------------------- */
      case 'S1':
        return <PrinterPickerStep draft={draft()} update={update} printers={props.printers} />

      /* ---- Results (T29, T30, T32) ------------------------------------ */
      case 'Q8':
      case 'S6':
        // Both flows end here: the results screen's own control finishes, rather
        // than advancing to a screen whose only content was that it is over.
        return <ResultsStep draft={draft()} update={update} printers={props.printers} />
    }
  }

  return (
    <StepChrome
      {...(progress() ?? {})}
      title={props.step.title}
      stepKey={props.step.id}
      gate={props.engine.gate()}
      back={props.step.back === null ? null : () => props.engine.back()}
      next={() => advance()}
      exit={() => props.engine.requestExit()}
      exitRequested={props.engine.exitRequested()}
      hasMeasurements={props.engine.hasMeasurements()}
      confirmExit={() => props.engine.confirmExit()}
      cancelExit={() => props.engine.cancelExit()}
      showNext={props.step.showNext ?? true}
      nextLabel={props.step.nextLabel}
      // A finishing control is styled as a way *out* rather than a way through:
      // it is the one Next-shaped button in the flow that does not advance.
      nextVariant={props.step.finishes === true ? 'outline' : 'primary'}
      showExit={props.step.showExit ?? true}
    >
      {content()}
    </StepChrome>
  )
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                              */
/* -------------------------------------------------------------------------- */

/** An instructional figure with its caption, sized by the stylesheet. */
function Figure(props: { image: ImageKey; caption: string }): JSX.Element {
  return (
    <figure>
      <img src={IMAGES[props.image]} alt={props.caption} loading="lazy" decoding="async" />
      <figcaption>{props.caption}</figcaption>
    </figure>
  )
}

function DesignDownload(props: { design: 'quad' | 'single' }): JSX.Element {
  return (
    <a
      class="button button-outline"
      href={STL[props.design]}
      download={STL_DOWNLOAD_NAMES[props.design]}
      data-testid="stl-download"
    >
      Download the {props.design}-beam STL
    </a>
  )
}

/* -------------------------------------------------------------------------- */
/* C1 — prerequisites (T24)                                                    */
/* -------------------------------------------------------------------------- */

const PREREQUISITES: readonly CheckboxItem[] = [
  {
    key: CHECKS.caliper,
    label: 'A decent modern pair of digital calipers',
    description:
      'The calipers should be capable of measuring a 140mm wide object, and should be able to measure accurately without drifting or excessive recalibration.',
  },
  {
    key: CHECKS.printer,
    label: 'A functional, calibrated printer',
    description:
      'The printer should be able to print the filament being used without warping or curling, and must be capable of printing a 140mm long beam. All motion calibration for the printer itself should be completed beforehand.',
  },
  {
    key: CHECKS.slicer,
    label: 'A modern slicer',
    description:
      'The slicer should expose a per-filament XY shrinkage setting for applying the calculated calibration value afterwards. This guide will cover OrcaSlicer/Bambu Studio; adjust to any other slicers as necessary.',
  },
]

function PrerequisitesStep(props: {
  draft: CalibrationDraft
  update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
  settings: SettingsStore
}): JSX.Element {
  const allChecked = () =>
    [CHECKS.caliper, CHECKS.printer, CHECKS.slicer].every((key) => isChecked(props.draft, key))

  return (
    <div class="stack">
      <p>Please verify that you have all prerequisites on hand.</p>

      <CheckboxGroup
        legend=""
        items={PREREQUISITES}
        isChecked={(key) => isChecked(props.draft, key)}
        onToggle={(key, checked) => props.update((draft) => setChecked(draft, key, checked))}
      />

      <div>
        <label class="check" for="dont-ask-again">
          <input
            id="dont-ask-again"
            type="checkbox"
            // Available only once everything is ticked: "don't ask me again"
            // before answering is not consent to skip anything.
            disabled={!allChecked()}
            checked={props.settings.skipPrerequisites()}
            aria-describedby="dont-ask-again-hint"
            onChange={(event) => props.settings.setSkipPrerequisites(event.currentTarget.checked)}
          />
          <span class="muted">Don’t ask again</span>
        </label>
        <small class="muted" id="dont-ask-again-hint">
          <Show when={allChecked()} fallback="">
            Skips the above checks for future runs; can be re-enabled from the saved printers
            screen.
          </Show>
          <Show when={props.settings.skipPrerequisites() && !props.settings.storage.persistent}>
            <strong>
              {' '}
              This browser would not save the setting, so the checklist will be shown again next
              time.
            </strong>
          </Show>
        </small>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* C2 — first time or not (T25)                                                */
/* -------------------------------------------------------------------------- */

function BranchStep(props: {
  draft: CalibrationDraft
  update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
  printers: PrinterRepository
  onOpenPrinters: () => void
}): JSX.Element {
  // Re-read on every access: the list is a signal, so returning from the
  // printer-data detour shows the new printers without any extra plumbing (T25.4).
  const saved = () => props.printers.list()
  const noneSaved = createMemo(() => saved().length === 0)

  const choose = (key: string) =>
    props.update((draft) => chooseExclusively(draft, key, [CHECKS.firstTime, CHECKS.returning]))

  return (
    <div class="stack">
      <p>
        If this is your first time using the Truss Calibrator on the{' '}
        <strong>printer being used for this calibration</strong>, the quad-beam variant will be used
        to obtain measurements of all four axes (X, Y, and the two diagonals).
      </p>
      <p>
        For subsequent runs on the same printer, the single-beam variant will be used to rapidly
        calibrate, extrapolating what the four axes values would be based on the first calibration
        results to minimize filament use.
      </p>

      <fieldset>
        {/* <legend>Is this the first calibration on this printer?</legend> */}

        <label class="check" for="branch-first-time">
          <input
            id="branch-first-time"
            type="radio"
            name="branch"
            checked={isChecked(props.draft, CHECKS.firstTime)}
            onChange={() => choose(CHECKS.firstTime)}
          />
          <span>First time — I have not used Truss Calibrator on this printer yet</span>
        </label>
        <p class="muted">Prints the larger quad-beam variant.</p>
        <p class="muted">
          This option should also be used if the printer's motion has changed significantly - for
          example by rebuilding a DIY 3D printer or adjusting skew compensation settings.
        </p>

        <label class="check" for="branch-returning">
          <input
            id="branch-returning"
            type="radio"
            name="branch"
            disabled={noneSaved()}
            aria-describedby={noneSaved() ? 'branch-returning-reason' : undefined}
            checked={isChecked(props.draft, CHECKS.returning)}
            onChange={() => choose(CHECKS.returning)}
          />
          <span>I've calibrated on this printer before</span>
        </label>
        <Show when={noneSaved()}>
          <p class="muted" id="branch-returning-reason">
            This option is available when a first-time calibration is run and saved on at least one
            printer.
          </p>
        </Show>
        <Show when={!noneSaved()}>
          <p class="muted">
            Prints the single-beam variant for faster calibration. <br />
            The following printers are currently saved:{' '}
            <For each={saved()}>
              {(printer, index) => (
                <span>
                  {index() > 0 ? ', ' : ''}
                  {printer.name}
                </span>
              )}
            </For>
            .
          </p>
        </Show>
      </fieldset>

      {/* <p class="muted">
        Nothing is saved until the end of a first-time calibration, and leaving now loses nothing.
      </p> */}

      {/*
       * The detour (T25.3). The disabled Single option tells the user to import a
       * profile; without this button the only way to do that is to leave the flow
       * and find the screen themselves. Returning from the printers screen always
       * lands on the landing page (decision 17), so the user re-enters the flow
       * and arrives here again with a freshly read list — which is exactly what
       * the detour is for.
       */}
      <button
        type="button"
        onClick={() => props.onOpenPrinters()}
        data-testid="open-printers"
        class="button-outline"
      >
        Edit saved printers
      </button>
      <small class="muted">Entering the printer edit menu exits the calibration flow.</small>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Filament prerequisites (Q1, S2)                                             */
/* -------------------------------------------------------------------------- */

const FILAMENT_CHECKS: readonly CheckboxItem[] = [
  {
    key: CHECKS.filamentTemperature,
    label: 'Temperature settings',
    description:
      "Going by the manufacturer's recommendation is usually enough; print a temperature tower and break it to test layer adhesion if necessary.",
  },
  {
    key: CHECKS.filamentPressureAdvance,
    label: 'Pressure advance / Flow dynamics',
    description:
      'In OrcaSlicer, select Calibration → Pressure advance from the app menu. In Bambu Studio, select the Calibration tab → Flow Dynamics. Make sure that the chosen value is properly applied to the printer/filament - for example under Device → Filament for Bambu printers, in per-filament K-factor settings, etc.',
  },
  {
    key: CHECKS.filamentFlowRate,
    label: 'Flow rate',
    description:
      'The “YOLO single-pass” method is recommended for OrcaSlicer users; use the built-in tool from the Calibration tab → Flow Ratio in Bambu Studio. If you are using the two-pass test and are torn between two chips on the first pass, choose the higher value; the second pass only tests values below it.',
  },
]

function FilamentPrerequisitesStep(props: {
  draft: CalibrationDraft
  update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
}): JSX.Element {
  return (
    <div class="stack">
      <p>Please ensure that you have completed prerequisite tuning on the filament being used.</p>

      <CheckboxGroup
        legend=""
        items={FILAMENT_CHECKS}
        isChecked={(key) => isChecked(props.draft, key)}
        onToggle={(key, checked) => props.update((draft) => setChecked(draft, key, checked))}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Slicing (Q2, S3)                                                            */
/* -------------------------------------------------------------------------- */

function SliceStep(props: {
  design: 'quad' | 'single'
  draft: CalibrationDraft
  update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
}): JSX.Element {
  return (
    <div class="stack">
      <p>
        {props.design === 'quad'
          ? 'The quad-beam file will be used for the first-time calibration. If you do not have this file on hand yet, download it below.'
          : 'The single-beam file will be used for rapid calibration. If you do not have this file on hand yet, download it below.'}
      </p>

      <DesignDownload design={props.design} />

      <Figure
        image={props.design === 'quad' ? 'trussQuad' : 'trussSingle'}
        caption={
          props.design === 'quad'
            ? 'The quad-beam design loaded in OrcaSlicer.'
            : 'The single-beam design loaded in OrcaSlicer.'
        }
      />

      <p>
        Load it into your slicer and slice it with settings that print accurately and reliably —
        nothing that will warp, curl, or come out dimensionally wrong from printing too fast.
      </p>

      <Figure
        image={props.design === 'quad' ? 'slicerLoaded' : 'slicedSingle'}
        caption="Example sliced results."
      />

      <h3>Verify seam locations</h3>
      <p>
        Seams may cause protrusions which interfere with measurements; ensure that they are not on
        the measurement surfaces.
      </p>
      <p>In the sliced preview, turn seam visibility on:</p>
      <Figure image="seamVisibility" caption="Seam visibility enabled in the preview." />
      <p>Inspect the outer measurement walls and verify that no seams exist on them:</p>
      <Figure image="outerMeasurementWalls" caption="The outer measurement walls." />
      <p>Repeat for the inner measurement walls:</p>
      <Figure image="innerMeasurementWalls" caption="The inner measurement walls." />
      <p>
        If the slicer has placed seams on any of these walls, relocate them with the seam tool or by
        adjusting seam location settings.
      </p>
      <Figure image="seamTool" caption="The location of the seam paint tool in OrcaSlicer." />
      <Figure
        image="outerSeamExample"
        caption="Marking a non-measurement area to place the seam."
      />

      <label class="check" for={`${props.design}-sliced`}>
        <input
          id={`${props.design}-sliced`}
          type="checkbox"
          checked={isChecked(props.draft, CHECKS.sliced)}
          onChange={(event) =>
            props.update((draft) => setChecked(draft, CHECKS.sliced, event.currentTarget.checked))
          }
        />
        <span>I have sliced the file with no seams on the measurement faces</span>
      </label>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Printing (Q3, S4)                                                           */
/* -------------------------------------------------------------------------- */

function PrintStep(props: {
  design: 'quad' | 'single'
  draft: CalibrationDraft
  update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
}): JSX.Element {
  return (
    <div class="stack">
      <p>Print the sliced file.</p>
      <Figure
        image={props.design === 'quad' ? 'printingQuad' : 'printingSingle'}
        caption="Printing the calibrator."
      />

      <Figure
        image="finishedPrint"
        caption="Printed sample for the quad-beam design; the single-beam design should be treated in the same way."
      />

      <p class="warning">
        Once the print is completed, <strong>do not force the print off the build plate</strong> -
        this may warp the print and render measurements meaningless. Wait for the print to cool,
        then remove it from the build plate without excess force.
      </p>

      <label class="check" for={`${props.design}-printed`}>
        <input
          id={`${props.design}-printed`}
          type="checkbox"
          checked={isChecked(props.draft, CHECKS.printed)}
          onChange={(event) =>
            props.update((draft) => setChecked(draft, CHECKS.printed, event.currentTarget.checked))
          }
        />
        <span>
          I have printed the calibrator and removed it from the build plate without deforming it
        </span>
      </label>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Locate the beam (Q4)                                                        */
/* -------------------------------------------------------------------------- */

function LocateBeamStep(): JSX.Element {
  return (
    <div class="stack">
      <p>
        The first beam to measure is the one for the X axis; it is marked with an X symbol on the
        end.
      </p>
      <Figure image="xBeam" caption="The X beam." />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Measurement (Q5, Q6, S5)                                                    */
/* -------------------------------------------------------------------------- */

function MeasureStep(props: {
  axes: readonly AxisId[]
  design: 'quad' | 'single'
  draft: CalibrationDraft
  update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
}): JSX.Element {
  return (
    <div class="stack">
      {/*
       * Only the warnings that apply to *every* dimension live up here. The
       * inner-jaws guidance is specific to one of them, so it sits inside that
       * dimension's own section in `AxisMeasurements` rather than above both.
       */}
      <h3>Before you measure</h3>
      <div class="warning">
        <p>
          <strong>Do not squeeze the print with the calipers.</strong> Applying excess force can
          deform the plastic and give incorrect results; ideally the calipers should exert no force
          on the print at all.
        </p>
        <p>If your calipers have a thumb wheel, do not use it to add pressure.</p>
        <p>
          <strong>Keep the calipers parallel to what you are measuring.</strong> Angled jaws will
          measure a diagonal, throwing off measurements entirely.
        </p>
      </div>

      <For each={props.axes}>
        {(axis) => (
          <AxisMeasurements
            axis={axis}
            design={props.design}
            draft={props.draft}
            update={props.update}
          />
        )}
      </For>
    </div>
  )
}

/**
 * One beam's two dimensions, as a section each.
 *
 * A section runs diagram → photograph → field: the diagram says *where* on the
 * print the calipers go, the photograph shows a real pair seated there, and only
 * then is the user asked for a number. Asking first would have them commit a
 * reading before showing them what they were supposed to be measuring, and it is
 * the order the guide itself uses (step 9).
 *
 * The inner-jaws guidance sits *inside* the inner section, between the inner
 * photograph and the field it explains: it is advice about the inner measurement
 * alone, and it is of no use until the user is looking at the inner jaws.
 */
function AxisMeasurements(props: {
  axis: AxisId
  design: 'quad' | 'single'
  draft: CalibrationDraft
  update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
}): JSX.Element {
  const entry = () => props.draft.entries[props.axis]
  const single = () => props.design === 'single'

  /** The CAD diagram and the matching real-world photograph for each side. */
  const media = (): Readonly<
    Record<'outer' | 'inner', { readonly diagram: ImageKey; readonly photo: ImageKey }>
  > =>
    props.design === 'single'
      ? {
          outer: { diagram: 'outerMeasurementSingle', photo: 'singleMeasurementOuter' },
          inner: { diagram: 'innerMeasurementSingle', photo: 'singleMeasurementInner' },
        }
      : {
          outer: { diagram: 'xOuterDiagram', photo: 'xOuterMeasurement' },
          inner: { diagram: 'xInnerDiagram', photo: 'xInnerMeasurement' },
        }

  const photoCaption = (side: 'outer' | 'inner'): string =>
    props.design === 'quad'
      ? `Taking the ${props.axis} ${side} measurement.`
      : `Taking the ${side} measurement.`

  /*
   * Both helpers below read the draft, and both are called only from JSX or from
   * the fields' own input handlers — which are tracked scopes. The rule cannot see
   * through those call sites, so the directives record the fact rather than hide a
   * problem.
   */
  const warnings = (which: 'outer' | 'inner') =>
    fieldWarnings(entry()[which], entry().outer, entry().inner)

  const set = (side: 'outer' | 'inner', text: string) =>
    // eslint-disable-next-line solid/reactivity
    untrack(() => props.update((draft) => setMeasurement(draft, props.axis, side, text)))

  return (
    <fieldset class="stack">
      {/* <legend>{props.axis} beam</legend> */}

      {/*
       * Every figure is the full width of the step. These pairs used to be a
       * two-up grid, with both fields first and the diagrams below them; a diagram
       * at half the step's width is too small to read the jaw placement from,
       * which is the only reason it is on the screen.
       */}
      <h3>Measure the outer dimension</h3>
      <p>
        Use your calipers to measure the outer dimension across the two marked walls shown below.
      </p>
      <Figure image={media().outer.diagram} caption="Where the outer measurement goes." />
      <Figure image={media().outer.photo} caption={photoCaption('outer')} />

      <br />
      <p>Enter the measured dimension below.</p>
      <MeasurementField
        id={`${props.axis}-outer`}
        label={`${props.axis} Outer`}
        value={entry().outer}
        onInput={(text) => set('outer', text)}
        warnings={warnings('outer')}
      />

      <br />
      <br />

      <h3>Measure the inner dimension</h3>
      <Figure image={media().inner.diagram} caption="Where the inner measurement goes." />
      <Figure image={media().inner.photo} caption={photoCaption('inner')} />

      {/*
       * The inner-jaws guidance, between the inner photograph and the inner
       * field. One section down from the dimension it belongs to — hence `h4`,
       * with the correct/incorrect examples one further down from that.
       *
       * The list is a direct child, not wrapped in a `<p>`.
       *
       * `<p>` may not contain a `<ul>`: the HTML parser closes the paragraph when
       * it meets the list, and the stray `</p>` becomes an empty one. That is
       * merely untidy in a hand-written page, but Solid builds each screen from a
       * `<template>`, so the parser's corrected tree no longer matches the child
       * indices the compiler generated — and the figures, headings and paragraphs
       * that follow render in an order that is not the order they are written in.
       */}
      <br />
      <h4>Warnings regarding the inner measurement</h4>
      <p>Before measuring, please take note of the correct way to measure the inner dimensions.</p>
      <Show when={single()}>
        <p class="muted">
          These photos are of the quad-beam design; the single-beam design is measured in the same
          way.
        </p>
      </Show>
      <ul>
        <li>
          The calipers should enter from the <strong>top of the print</strong>
        </li>
        <li>
          The <strong>flat side of the calipers</strong> should face{' '}
          <strong>the supportive walls located halfway across the beam</strong>
        </li>
        <li>
          The same is true for <strong>both caliper jaws</strong> - verify that both sides are
          seated properly
        </li>
      </ul>

      <Figure image="caliperEnterTop" caption="The caliper enters from the top of the print." />
      <Figure
        image="innerCorrect1"
        caption="The flat inner sides sit flush against the support walls halfway across the beam."
      />
      <Figure image="innerCorrect2" caption="The same at both ends of the caliper." />
      <br />

      <h5>Incorrect examples</h5>
      <p>
        Incorrect: The calipers are not touching the supportive walls, leading to a diagonal longer
        measurement.
      </p>
      <Figure
        image="calipersIncorrectGap"
        caption="The flat sides are not touching the support walls."
      />
      <p>
        Incorrect: the calipers have been inserted from the bottom of the print, causing the slanted
        side of the calipers to face the suppportive walls.
      </p>
      <Figure image="calipersIncorrectSide" caption="Measuring from the bottom of the print." />

      <br />

      <p>With the above notes in mind, please measure and enter the inner dimension.</p>

      <MeasurementField
        id={`${props.axis}-inner`}
        label={`${props.axis} inner`}
        value={entry().inner}
        onInput={(text) => set('inner', text)}
        warnings={warnings('inner')}
      />
    </fieldset>
  )
}

/* -------------------------------------------------------------------------- */
/* Remaining beams (Q6)                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The last three beams, as a table of beams against sides.
 *
 * Step 5 has just shown the caliper seating at full width and made the case for
 * it; Q6 is where the user repeats that three more times. Repeating the same
 * instructions and the same photographs would be the previous page one step
 * later, and it would push the six readings the user came here to enter below
 * several screens of pictures they have already read.
 */
function MeasureTableStep(props: {
  axes: readonly AxisId[]
  draft: CalibrationDraft
  update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
}): JSX.Element {
  return (
    <div class="stack">
      <h3>Measuring the dimensions</h3>
      <p>
        Measure each of these beams the same way as the X beam, and enter the outer and inner
        dimensions.
      </p>
      <MeasurementTable axes={props.axes} draft={props.draft} update={props.update} />
    </div>
  )
}

function MeasurementTable(props: {
  axes: readonly AxisId[]
  draft: CalibrationDraft
  update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
}): JSX.Element {
  const entry = (axis: AxisId) => props.draft.entries[axis]

  const warnings = (axis: AxisId, which: 'outer' | 'inner') =>
    fieldWarnings(entry(axis)[which], entry(axis).outer, entry(axis).inner)

  const set = (axis: AxisId, which: 'outer' | 'inner', text: string) =>
    untrack(() => props.update((draft) => setMeasurement(draft, axis, which, text)))

  /*
   * A real `<table>`: `Beam` is the row header and the two sides are the column
   * headers, which is what names each field on screen. The fields therefore carry
   * no visible label — only the `aria-label` that keeps each input individually
   * addressable for someone tabbing through the form, for whom "Outer" alone
   * would not say outer *of what*.
   */
  return (
    <table class="measurement-table">
      <caption class="sr-only">Outer and inner measurements for each beam</caption>
      <thead>
        <tr>
          <th scope="col">Beam</th>
          <th scope="col">Outer</th>
          <th scope="col">Inner</th>
        </tr>
      </thead>
      <tbody>
        <For each={props.axes}>
          {(axis) => (
            <tr>
              <th scope="row">{axis}</th>
              <td>
                <MeasurementField
                  labelMode="cell"
                  id={`${axis}-outer`}
                  label={`${axis} outer (across both end walls)`}
                  value={entry(axis).outer}
                  onInput={(text) => set(axis, 'outer', text)}
                  warnings={warnings(axis, 'outer')}
                />
              </td>
              <td>
                <MeasurementField
                  labelMode="cell"
                  id={`${axis}-inner`}
                  label={`${axis} inner (between the two walls)`}
                  value={entry(axis).inner}
                  onInput={(text) => set(axis, 'inner', text)}
                  warnings={warnings(axis, 'inner')}
                />
              </td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  )
}

/* -------------------------------------------------------------------------- */
/* Q7 — the factor and the save gate (T28)                                     */
/* -------------------------------------------------------------------------- */

function FactorSaveStep(props: {
  draft: CalibrationDraft
  update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
  printers: PrinterRepository
  storage: PrinterRepository['storage']
}): JSX.Element {
  const outcome = createMemo(() => evaluateQuadOrNull(props.draft))
  const degraded = () => props.storage.degraded()

  /** What the user has typed, verbatim; the draft records what it *means*. */
  const [name, setName] = createSignal(untrack(() => props.draft.printerName ?? ''))

  /** The saved record the typed name would clash with, if any. */
  const clash = createMemo(() => {
    const trimmed = name().trim()
    return trimmed === '' ? null : props.printers.getByName(trimmed)
  })

  /*
   * Degraded mode skips the save gate as **unsatisfiable** rather than merely
   * inconvenient (PRD §12, decision 15): the gate exists to guarantee the factor
   * is not lost, and in a session where nothing can be stored it can never
   * succeed. Marking the check is how the gate is skipped without teaching the
   * registry about storage — and the factor is still displayed above, so the user
   * can write it down.
   */
  onMount(() => {
    if (degraded().degraded) {
      props.update((draft) => setChecked(draft, CHECKS.printerNameReady, true))
    }
  })

  /**
   * Mirror the field into the draft on every keystroke.
   *
   * Two facts go in, and both are what the rest of the flow reads: the name
   * `StepScreen` writes when Next is pressed, and whether pressing it is allowed
   * at all. Keeping either in this component's own state would let the button the
   * user sees and the record that gets written disagree.
   */
  const onName = (text: string): void => {
    setName(text)
    const trimmed = text.trim()
    const ready = trimmed !== '' && !props.printers.exists(trimmed) && outcome() !== null
    props.update((draft) =>
      setChecked(setPrinterName(draft, trimmed), CHECKS.printerNameReady, ready),
    )
  }

  return (
    <div class="stack">
      <h3>Extrapolation factor</h3>
      <p>
        This is the multiplier to predict the measurements of a 4-beam print from just a single
        X-axis beam; this will be used for future single-beam rapid calibrations on the same
        printer.
      </p>

      <p class="readout numeric" data-testid="factor-value">
        {outcome()?.display.factor ?? '—'}
      </p>

      <Show when={degraded().degraded}>
        <p class="banner" role="status" data-testid="save-gate-skipped">
          This browser is not letting the app store data, so this factor cannot be saved. Write it
          down from the value above and add it on the saved printers screen when storage works.
        </p>
      </Show>

      <Show when={!degraded().degraded}>
        <div class="stack">
          <p>Please give a name of the printer to save this setting for.</p>
          <p>
            Examples are "Bambu P1S", "Prusa Core One", and similar; make sure that it can uniquely
            identify the printer (for example "P1S-001" if you have multiple P1S printers) as each
            printer will have a different extrapolation factor.
          </p>
          <label for="printer-name-field">Printer Name</label>
          <input
            id="printer-name-field"
            type="text"
            autocomplete="off"
            value={name()}
            aria-invalid={clash() === null ? 'false' : 'true'}
            aria-describedby={clash() === null ? undefined : 'printer-name-taken'}
            onInput={(event) => onName(event.currentTarget.value)}
          />
          <Show when={clash()}>
            {(taken) => (
              <p class="error" id="printer-name-taken" role="alert" data-testid="collision-warning">
                A printer called “{taken().name}” is already saved. Names are unique and not
                case-sensitive, so choose another name to continue.
              </p>
            )}
          </Show>
          <p class="muted" data-testid="save-hint">
            Continuing saves this printer, with the factor above, for its future single-beam
            recalibrations.
          </p>
        </div>
      </Show>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* S1 — printer picker (T31)                                                   */
/* -------------------------------------------------------------------------- */

function PrinterPickerStep(props: {
  draft: CalibrationDraft
  update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
  printers: PrinterRepository
}): JSX.Element {
  const choose = (name: string) =>
    props.update((draft) => setChecked(setPrinterName(draft, name), CHECKS.printerSelected, true))

  return (
    <div class="stack">
      <p>
        Pick the printer you are calibrating. Its saved factor is used to extrapolate this
        single-beam measurement to what a quad print would have measured.
      </p>

      <fieldset>
        <legend>Saved printers</legend>
        <For each={props.printers.list()}>
          {(printer) => (
            <label class="check" for={`pick-${printer.name}`}>
              <input
                id={`pick-${printer.name}`}
                type="radio"
                name="printer"
                checked={props.draft.printerName === printer.name}
                onChange={() => choose(printer.name)}
              />
              <span>
                {printer.name}{' '}
                <span class="numeric muted">({formatFactor(printer.extrapolationFactor)})</span>
              </span>
            </label>
          )}
        </For>
      </fieldset>

      <p class="muted">
        If this printer is not here, exit and run a first-time calibration — or import the file you
        exported, from the saved printers screen.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Small local helpers                                                         */
/* -------------------------------------------------------------------------- */

function evaluateQuadOrNull(draft: CalibrationDraft) {
  return evaluateQuad(draft)
}
