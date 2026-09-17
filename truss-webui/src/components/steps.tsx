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
        return <MeasureStep axes={['Y', 'A', 'B']} draft={draft()} update={update} design="quad" />

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

      /* ---- Results (T29, T30, T32) ----------------------------------- */
      case 'Q8':
      case 'S6':
        return <ResultsStep draft={draft()} update={update} printers={props.printers} />

      /* ---- Exit screens (T30.2, T32.3) ------------------------------- */
      case 'Q9':
      case 'S7':
        // The success path, not a cancellation: it leaves directly, without the
        // confirmation the chrome's Cancel control always asks for.
        return <FinishedStep onExit={() => props.engine.goToLanding()} />
    }
  }

  return (
    <StepChrome
      {...(progress() ?? {})}
      title={props.step.title}
      stepKey={props.step.id}
      gate={props.engine.gate()}
      back={props.step.back === null ? null : () => props.engine.back()}
      next={() => props.engine.next()}
      exit={() => props.engine.requestExit()}
      exitRequested={props.engine.exitRequested()}
      hasMeasurements={props.engine.hasMeasurements()}
      confirmExit={() => props.engine.confirmExit()}
      cancelExit={() => props.engine.cancelExit()}
      showNext={props.step.showNext ?? true}
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
      class="button"
      href={STL[props.design]}
      download={STL_DOWNLOAD_NAMES[props.design]}
      data-testid="stl-download"
    >
      Download the {props.design} STL
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
      'They need at least 150mm of range, and they need to measure the same thing twice. Check by measuring something over 100mm ten times, closing the jaws and re-zeroing between attempts: note how many measurements it managed before drifting, and re-zero it that often.',
  },
  {
    key: CHECKS.printer,
    label: 'A functional, calibrated printer',
    description:
      'Motion properly calibrated (rotation distance and similar), and skew correction calibrated first if you use Klipper. A build plate of at least 150×150mm, and a printer that can print your filament without warping or curling.',
  },
  {
    key: CHECKS.slicer,
    label: 'A modern slicer',
    description:
      'One that slices the calibrator designs reliably, and ideally exposes a per-filament XY shrinkage setting — OrcaSlicer, Bambu Studio, SuperSlicer and Cura all do. The instructions use OrcaSlicer and Bambu Studio as the examples.',
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
      <p>
        Three things need to be true before a calibration means anything. Ticking them is how you
        confirm you have checked — the app cannot verify any of them.
      </p>

      <CheckboxGroup
        legend="Before you start"
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
          <span>Don’t ask again</span>
        </label>
        <p class="muted" id="dont-ask-again-hint">
          <Show
            when={allChecked()}
            fallback="Tick all three first. This can be brought back later from the saved printers screen."
          >
            Skips this checklist from now on. You can bring it back from the saved printers screen.
          </Show>
          <Show when={props.settings.skipPrerequisites() && !props.settings.storage.persistent}>
            <strong>
              {' '}
              This browser would not save the setting, so the checklist will be shown again next
              time.
            </strong>
          </Show>
        </p>
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
        The two flows do the same arithmetic from different measurements. A first-time calibration
        measures all four beams and works out the printer’s extrapolation factor; after that, one
        beam is enough.
      </p>

      <fieldset>
        <legend>Is this the first calibration on this printer?</legend>

        <label class="check" for="branch-first-time">
          <input
            id="branch-first-time"
            type="radio"
            name="branch"
            checked={isChecked(props.draft, CHECKS.firstTime)}
            onChange={() => choose(CHECKS.firstTime)}
          />
          <span>Yes — I have not calibrated this printer yet</span>
        </label>
        <p class="muted">
          Prints all four beams. Takes longer, and gives the extrapolation factor that makes later
          calibrations quick.
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
          <span>No — this printer already has a saved factor</span>
        </label>
        <Show when={noneSaved()}>
          <p class="muted" id="branch-returning-reason">
            No printers saved - run a first-time calibration first or import saved printer profiles.
          </p>
        </Show>
        <Show when={!noneSaved()}>
          <p class="muted">
            Calibrates from a single beam, extrapolated by the saved factor:{' '}
            <For each={saved()}>
              {(printer, index) => (
                <span>
                  {index() > 0 ? ', ' : ''}
                  {printer.name} ({formatFactor(printer.extrapolationFactor)})
                </span>
              )}
            </For>
            .
          </p>
        </Show>
      </fieldset>

      <p class="muted">
        Nothing is saved until the end of a first-time calibration, and leaving now loses nothing.
      </p>

      {/*
       * The detour (T25.3). The disabled Single option tells the user to import a
       * profile; without this button the only way to do that is to leave the flow
       * and find the screen themselves. Returning from the printers screen always
       * lands on the landing page (decision 17), so the user re-enters the flow
       * and arrives here again with a freshly read list — which is exactly what
       * the detour is for.
       */}
      <button type="button" onClick={() => props.onOpenPrinters()} data-testid="open-printers">
        Saved printers
      </button>
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
      'The manufacturer’s recommendation is usually enough, and the later steps will make any problem obvious. If you print a temperature tower, break it apart to judge layer adhesion rather than going by looks.',
  },
  {
    key: CHECKS.filamentPressureAdvance,
    label: 'Pressure advance / flow dynamics',
    description:
      'OrcaSlicer: Calibration → Pressure advance. Bambu Studio: Calibration → Flow dynamics. Make sure the chosen value is actually applied to the printer — Bambu users often have to select the K value under Device → Filament; Klipper users may need a per-filament start macro.',
  },
  {
    key: CHECKS.filamentFlowRate,
    label: 'Flow rate',
    description:
      'Both slicers have a calibration for this. Orca’s “YOLO single-pass” is the quickest. If you use Bambu Studio’s two-pass test and you are torn between two chips on the first pass, take the higher value: the second pass only tests values below it.',
  },
]

function FilamentPrerequisitesStep(props: {
  draft: CalibrationDraft
  update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
}): JSX.Element {
  return (
    <div class="stack">
      <p>
        Shrinkage measurement is a comparison against what the printer was asked to print. If flow
        or pressure advance is wrong, the measurement describes that error as much as it describes
        shrinkage.
      </p>

      <CheckboxGroup
        legend="Filament prerequisites"
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
          ? 'The quad design prints all four beams at once. It is the only one that can establish the extrapolation factor.'
          : 'The single design prints one beam. It is only useful once this printer has a saved factor.'}
      </p>

      <DesignDownload design={props.design} />

      <Figure
        image={props.design === 'quad' ? 'trussQuad' : 'trussSingle'}
        caption={props.design === 'quad' ? 'The quad design.' : 'The single design.'}
      />

      <p>
        Load it into your slicer and slice it with settings that print accurately and reliably —
        nothing that will warp, curl, or come out dimensionally wrong from printing too fast.
      </p>

      <Figure
        image={props.design === 'quad' ? 'slicerLoaded' : 'slicedSingle'}
        caption="Loaded and sliced."
      />

      <h3>Keep the seams off the measured faces</h3>
      <p>
        A seam is a small bump. On a measured face it becomes part of the measurement, and it will
        be different on every print. In the preview, turn seam visibility on:
      </p>
      <Figure image="seamVisibility" caption="Seam visibility enabled in the preview." />
      <p>Check both faces the calipers will touch — the outer faces and the inner walls:</p>
      <Figure image="outerMeasurementWalls" caption="The walls the outer measurement spans." />
      <Figure
        image="innerMeasurementWalls"
        caption="The walls the inner measurement sits between."
      />
      <p>
        If the slicer put seams there, move them with the seam tool, or place them at the back of
        the print where nothing is measured.
      </p>
      <Figure image="seamTool" caption="Choosing where to place a seam." />
      <Figure image="outerSeamExample" caption="Seams moved off the measured face." />

      <label class="check" for={`${props.design}-sliced`}>
        <input
          id={`${props.design}-sliced`}
          type="checkbox"
          checked={isChecked(props.draft, CHECKS.sliced)}
          onChange={(event) =>
            props.update((draft) => setChecked(draft, CHECKS.sliced, event.currentTarget.checked))
          }
        />
        <span>I have sliced the file with no seams on the measured faces</span>
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
      <Figure
        image={props.design === 'quad' ? 'printingQuad' : 'printingSingle'}
        caption="Printing the calibrator."
      />

      <p class="warning">
        <strong>Do not force the print off the build plate.</strong> 3D printed plastic is elastic:
        prying it up warps it, and a warped beam measures shorter than what was printed. Wait for it
        to cool, then take it off — and do not measure it while it is still attached to a plate.
      </p>

      <Figure image="finishedPrint" caption="Cooled and removed." />

      <label class="check" for={`${props.design}-printed`}>
        <input
          id={`${props.design}-printed`}
          type="checkbox"
          checked={isChecked(props.draft, CHECKS.printed)}
          onChange={(event) =>
            props.update((draft) => setChecked(draft, CHECKS.printed, event.currentTarget.checked))
          }
        />
        <span>I have printed it, cooled it, and removed it without forcing it</span>
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
        The first beam to measure is the one along the X axis, marked with an X moulded into the
        print.
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
  const single = () => props.design === 'single'

  return (
    <div class="stack">
      <h3>Before you measure</h3>
      <div class="warning">
        <p>
          <strong>Do not squeeze the print with the calipers.</strong> The truss resists it, but
          plastic gives: excess force measures your grip, not the print. Ideally the calipers exert
          no force at all — many people let go of the clamping side entirely and let the print push
          the jaws back. If your calipers have a thumb wheel, do not use it to add pressure.
        </p>
        <p>
          <strong>Keep the calipers parallel to what you are measuring.</strong> Angled jaws measure
          a diagonal, which is always longer.
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

      <h3>Seating the inner jaws correctly</h3>
      <p>
        The inner measurement is the easy one to get wrong, and a wrong one is not obviously wrong:
        it reads as a plausible number that is simply longer than what was printed.
      </p>
      <Show when={single()}>
        <p class="muted">
          These photos are of the quad design; the single design is measured exactly the same way.
        </p>
      </Show>

      <h4>Correct</h4>
      <Figure image="caliperEnterTop" caption="The caliper enters from the top of the print." />
      <Figure
        image="innerCorrect1"
        caption="The flat inner sides sit flush against the support walls halfway across the beam."
      />
      <Figure image="innerCorrect2" caption="The same at both ends of the caliper." />

      <h4>Incorrect</h4>
      <Figure
        image="calipersIncorrectGap"
        caption="Incorrect: the flat sides are not touching the support walls, so the reading is a longer diagonal."
      />
      <Figure
        image="calipersIncorrectSide"
        caption="Incorrect: measuring from the bottom of the print, so the slanted outer faces meet the support walls."
      />
    </div>
  )
}

function AxisMeasurements(props: {
  axis: AxisId
  design: 'quad' | 'single'
  draft: CalibrationDraft
  update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
}): JSX.Element {
  const entry = () => props.draft.entries[props.axis]

  const diagrams = (): { outer: ImageKey; inner: ImageKey } =>
    props.design === 'single'
      ? { outer: 'outerMeasurementSingle', inner: 'innerMeasurementSingle' }
      : { outer: 'xOuterDiagram', inner: 'xInnerDiagram' }

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
    <fieldset>
      <legend>{props.axis} beam</legend>

      <div class="measurement-grid">
        <div class="stack">
          <MeasurementField
            id={`${props.axis}-outer`}
            label={`${props.axis} outer (across both end walls)`}
            value={entry().outer}
            onInput={(text) => set('outer', text)}
            warnings={warnings('outer')}
          />
          <Figure image={diagrams().outer} caption="Where the outer measurement goes." />
        </div>

        <div class="stack">
          <MeasurementField
            id={`${props.axis}-inner`}
            label={`${props.axis} inner (between the two walls)`}
            value={entry().inner}
            onInput={(text) => set('inner', text)}
            warnings={warnings('inner')}
          />
          <Figure image={diagrams().inner} caption="Where the inner measurement goes." />
        </div>
      </div>

      <Show when={props.design === 'single'}>
        <div class="measurement-grid">
          <Figure image="singleMeasurementOuter" caption="Taking the outer measurement." />
          <Figure image="singleMeasurementInner" caption="Taking the inner measurement." />
        </div>
      </Show>
      <Show when={props.design === 'quad' && props.axis === 'X'}>
        <div class="measurement-grid">
          <Figure image="xOuterMeasurement" caption="Taking the X outer measurement." />
          <Figure image="xInnerMeasurement" caption="Taking the X inner measurement." />
        </div>
      </Show>
      <Show when={props.design === 'quad' && props.axis !== 'X'}>
        <p class="muted">
          Measure this beam the same way as X, and keep track of which beam is which — mixing up X,
          Y, A and B is the easiest way to get a wrong answer that looks right.
        </p>
      </Show>
    </fieldset>
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
  // `untrack`: a one-off read that seeds the field, after which the field owns
  // what the user typed.
  const [name, setName] = createSignal(untrack(() => props.draft.printerName ?? ''))
  const [error, setError] = createSignal<string | null>(null)

  const degraded = () => props.storage.degraded()
  const trimmed = () => name().trim()
  const collision = createMemo(() =>
    props.printers.exists(trimmed()) ? props.printers.getByName(trimmed()) : null,
  )

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
      props.update((draft) => setChecked(draft, CHECKS.printerSaved, true))
    }
  })

  function save(): void {
    const result = outcome()
    if (result === null) {
      return
    }
    if (trimmed() === '') {
      setError('Give the printer a name.')
      return
    }

    const written = props.printers.add({ name: trimmed(), extrapolationFactor: result.factor })
    if (!written.ok) {
      setError(
        written.error.kind === 'name-collision'
          ? `“${trimmed()}” is already saved as “${written.error.existingName}”. ` +
              'Printer names are unique. To reuse this name you would have to exit this flow, ' +
              'delete that printer on the saved printers screen, and start again — which discards ' +
              'all eight measurements. Choosing a different name keeps them.'
          : 'That name cannot be used.',
      )
      return
    }

    setError(null)
    // Reached only from the save button's click handler, so the implicit untracked
    // scope is the right one: the draft is read and written once per press.
    // eslint-disable-next-line solid/reactivity
    props.update((draft) =>
      setChecked({ ...draft, printerName: trimmed() }, CHECKS.printerSaved, true),
    )
    announce(
      written.value.persisted
        ? `Saved ${trimmed()}.`
        : 'The factor is shown below, but this browser could not save it — write it down.',
      'polite',
    )
  }

  return (
    <div class="stack">
      <h3>Extrapolation factor</h3>
      <p>
        This is how much longer the average of all four beams is than the X beam alone. It is
        specific to this printer, and it is what makes a single-beam calibration possible later.
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
          <label for="printer-name-field">Save this factor for</label>
          <input
            id="printer-name-field"
            type="text"
            autocomplete="off"
            value={name()}
            aria-invalid={error() === null ? 'false' : 'true'}
            aria-describedby={error() === null ? undefined : 'printer-name-field-error'}
            onInput={(event) => {
              setName(event.currentTarget.value)
              setError(null)
            }}
          />
          <Show when={collision() !== null}>
            <p class="warning" data-testid="collision-warning">
              A printer called “{collision()?.name}” is already saved. Names are unique and not
              case-sensitive.
            </p>
          </Show>
          <Show when={error()}>
            {(message) => (
              <p class="error" id="printer-name-field-error" role="alert" data-testid="save-error">
                {message()}
              </p>
            )}
          </Show>
          <button
            type="button"
            onClick={save}
            disabled={trimmed() === ''}
            data-testid="save-printer"
          >
            {isChecked(props.draft, CHECKS.printerSaved) ? 'Save again' : 'Save printer'}
          </button>
          <Show when={isChecked(props.draft, CHECKS.printerSaved)}>
            <p class="muted" data-testid="saved-state">
              Saved. You can continue.
            </p>
          </Show>
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
/* Q9, S7 — finished                                                           */
/* -------------------------------------------------------------------------- */

function FinishedStep(props: { onExit: () => void }): JSX.Element {
  return (
    <div class="stack">
      <p>
        That is the calibration done. The value is in your slicer’s filament profile, and this
        printer’s factor is saved for next time.
      </p>
      <p class="muted">
        Nothing about this calibration is kept — no history, no per-filament profiles. Re-run it
        whenever you change filament, or print a new beam to check that the factor still holds.
      </p>
      <button type="button" onClick={() => props.onExit()} data-testid="exit-to-landing">
        Done
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Small local helpers                                                         */
/* -------------------------------------------------------------------------- */

function evaluateQuadOrNull(draft: CalibrationDraft) {
  return evaluateQuad(draft)
}
