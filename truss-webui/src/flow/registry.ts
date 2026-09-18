import { CHECKS, isChecked, type CalibrationDraft } from '../domain/draft'
import { blockedGate, OPEN_GATE, type GateStatus, type StepId } from '../domain/flow'
import { readMeasurements } from '../domain/math'
import { AXES, type AxisId, type FlowId } from '../domain/types'

/**
 * The step registry (T15.1).
 *
 * Every step of both flows, in order, with the gate that decides whether it may
 * be left. Gates are expressed as small declarative specs rather than bespoke
 * predicates, because three quarters of them are one of two shapes — "these
 * tick-boxes are all set" and "these readings are all entered" — and hand-writing
 * those sixteen times is how a flow acquires one step whose Next unlocks too
 * early.
 *
 * The registry carries no JSX. Which component renders a step is a separate
 * mapping (added with the screens), so this module stays testable without a DOM
 * and cannot acquire an import cycle with the components it describes.
 */

export type GateSpec =
  /** Next is always available. */
  | { readonly kind: 'open' }
  /** Every listed tick-box must be set. */
  | {
      readonly kind: 'all'
      readonly keys: readonly string[]
      readonly reason: string
    }
  /** Any one of the listed tick-boxes satisfies the gate (a branch choice). */
  | {
      readonly kind: 'any'
      readonly keys: readonly string[]
      readonly reason: string
    }
  /** Every outer/inner reading for the listed axes must be present and valid. */
  | { readonly kind: 'measurements'; readonly axes: readonly AxisId[] }
  /** Bespoke logic, for the few steps that are genuinely one-offs. */
  | { readonly kind: 'custom'; readonly evaluate: (draft: CalibrationDraft) => GateStatus }

export interface StepSpec {
  readonly id: StepId
  readonly flow: FlowId
  /** The step's heading, and the focus target on entry (PRD §6.4). */
  readonly title: string
  readonly gate: GateSpec
  /**
   * The literal next step, or `null` when the engine decides — C2 branches on the
   * user's answer, and the terminal steps leave through their own button. A
   * `null` here is therefore *not* the same as "no way forward", which is why
   * Next's visibility is spelled out separately.
   */
  readonly next: StepId | null
  readonly back: StepId | null
  /** Hide the Next control: the step provides its own way out. Defaults to shown. */
  readonly showNext?: boolean
  /** The Next control's label, where "Next" is not what pressing it does. */
  readonly nextLabel?: string
  /**
   * This step's Next control ends the flow.
   *
   * The results screen is the last thing the user needs, so its primary control
   * finishes — returning to the landing screen — rather than advancing to a
   * screen that has nothing left to say. Spelled out rather than inferred from
   * `next === null`, which is also what C2 means before the branch has picked a
   * destination.
   *
   * The chrome also reads it for styling: a finishing control is drawn as an
   * outline, because it leaves the flow rather than moving through it.
   */
  readonly finishes?: boolean
  /**
   * Whether the flow's own Cancel control is offered here. Defaults to shown.
   *
   * Hidden on the finishing step, where Finish leaves the flow anyway: two
   * controls that both leave — one of them asking a question first — is a chance
   * to press the wrong one.
   */
  readonly showExit?: boolean
}

/** Build the `(draft) => GateStatus` the engine evaluates. */
export function buildGate(spec: GateSpec): (draft: CalibrationDraft) => GateStatus {
  switch (spec.kind) {
    case 'open':
      return () => OPEN_GATE

    case 'all':
      return (draft) =>
        spec.keys.every((key) => isChecked(draft, key)) ? OPEN_GATE : blockedGate(spec.reason)

    case 'any':
      return (draft) =>
        spec.keys.some((key) => isChecked(draft, key)) ? OPEN_GATE : blockedGate(spec.reason)

    case 'measurements':
      return (draft) => {
        const read = readMeasurements(draft, spec.axes)
        if (read.ok) {
          return OPEN_GATE
        }
        const expected = spec.axes.length * 2
        const missing = read.pending.length
        // Naming the count rather than the fields: the fields themselves already
        // carry their own errors, and repeating them here would make the gate
        // message a worse version of what the user is already looking at.
        return blockedGate(
          missing === expected
            ? 'Enter all the measurements to continue.'
            : `${missing} of ${expected} readings still needed.`,
        )
      }

    case 'custom':
      return spec.evaluate
  }
}

export interface RegisteredStep extends Omit<StepSpec, 'gate'> {
  readonly gate: (draft: CalibrationDraft) => GateStatus
}

function register(specs: readonly StepSpec[]): ReadonlyMap<StepId, RegisteredStep> {
  const map = new Map<StepId, RegisteredStep>()
  for (const spec of specs) {
    map.set(spec.id, { ...spec, gate: buildGate(spec.gate) })
  }
  return map
}

const PREREQUISITE_REASON = 'Tick all three prerequisites to continue.'
const FILAMENT_REASON = 'Tick all three filament checks to continue.'
const BRANCH_REASON = 'Choose one to continue.'

/* -------------------------------------------------------------------------- */
/* Common steps (PRD §9.2)                                                     */
/* -------------------------------------------------------------------------- */

const COMMON_STEPS: readonly StepSpec[] = [
  {
    id: 'C1',
    flow: 'quad',
    title: 'Before you start',
    gate: {
      kind: 'all',
      keys: [CHECKS.caliper, CHECKS.printer, CHECKS.slicer],
      reason: PREREQUISITE_REASON,
    },
    next: 'C2',
    back: null,
  },
  {
    id: 'C2',
    flow: 'quad',
    title: 'First time on this printer?',
    gate: {
      kind: 'any',
      keys: [CHECKS.firstTime, CHECKS.returning],
      reason: BRANCH_REASON,
    },
    // The branch decides where Next goes; see `nextAfter`.
    next: null,
    back: 'C1',
  },
]

/* -------------------------------------------------------------------------- */
/* Quad flow (PRD §9.3)                                                        */
/* -------------------------------------------------------------------------- */

const QUAD_STEPS: readonly StepSpec[] = [
  {
    id: 'Q1',
    flow: 'quad',
    title: 'Filament prerequisites',
    gate: {
      kind: 'all',
      keys: [CHECKS.filamentTemperature, CHECKS.filamentPressureAdvance, CHECKS.filamentFlowRate],
      reason: FILAMENT_REASON,
    },
    next: 'Q2',
    back: 'C2',
  },
  {
    id: 'Q2',
    flow: 'quad',
    title: 'Slice the quad design',
    gate: { kind: 'all', keys: [CHECKS.sliced], reason: 'Confirm that you have sliced the file.' },
    next: 'Q3',
    back: 'Q1',
  },
  {
    id: 'Q3',
    flow: 'quad',
    title: 'Print the quad design',
    gate: { kind: 'all', keys: [CHECKS.printed], reason: 'Confirm that the print is done.' },
    next: 'Q4',
    back: 'Q2',
  },
  {
    id: 'Q4',
    flow: 'quad',
    title: 'Find the X beam',
    gate: { kind: 'open' },
    next: 'Q5',
    back: 'Q3',
  },
  {
    id: 'Q5',
    flow: 'quad',
    title: 'Measure the X beam',
    gate: { kind: 'measurements', axes: ['X'] },
    next: 'Q6',
    back: 'Q4',
  },
  {
    id: 'Q6',
    flow: 'quad',
    title: 'Measure Y, A and B',
    gate: { kind: 'measurements', axes: ['Y', 'A', 'B'] },
    next: 'Q7',
    back: 'Q5',
  },
  {
    id: 'Q7',
    flow: 'quad',
    title: 'Save the extrapolation factor',
    // Satisfied while the typed name is non-empty and unused. Q7's Next is what
    // writes the record, so this is the whole of "may the user leave".
    gate: {
      kind: 'all',
      keys: [CHECKS.printerNameReady],
      reason: 'Enter a printer name that is not already saved to continue.',
    },
    next: 'Q8',
    back: 'Q6',
  },
  {
    id: 'Q8',
    flow: 'quad',
    title: 'Your slicer setting',
    gate: { kind: 'measurements', axes: AXES },
    next: null,
    // No Back. Q7 has already written the printer record by the time this screen
    // is reached, so returning to it would mean either a second record or a
    // rename of one already saved — the factor the user is reading here would no
    // longer be the factor under that name.
    back: null,
    // The flow ends here. Finish is the success path, so it leaves without the
    // confirmation Cancel would put in front of the same outcome.
    finishes: true,
    nextLabel: 'Finish',
    showExit: false,
  },
]

/* -------------------------------------------------------------------------- */
/* Quick flow (PRD §9.4)                                                       */
/* -------------------------------------------------------------------------- */

const SINGLE_STEPS: readonly StepSpec[] = [
  {
    id: 'S1',
    flow: 'single',
    title: 'Choose a printer',
    gate: {
      kind: 'all',
      keys: [CHECKS.printerSelected],
      reason: 'Choose the printer you are calibrating.',
    },
    next: 'S2',
    // S1 is reached *from* C2, so its Back returns there and lets the user
    // change their branch answer; nothing has been measured yet, so no
    // confirmation is involved either way.
    back: 'C2',
  },
  {
    id: 'S2',
    flow: 'single',
    title: 'Filament prerequisites',
    gate: {
      kind: 'all',
      keys: [CHECKS.filamentTemperature, CHECKS.filamentPressureAdvance, CHECKS.filamentFlowRate],
      reason: FILAMENT_REASON,
    },
    next: 'S3',
    back: 'S1',
  },
  {
    id: 'S3',
    flow: 'single',
    title: 'Slice the single design',
    gate: { kind: 'all', keys: [CHECKS.sliced], reason: 'Confirm that you have sliced the file.' },
    next: 'S4',
    back: 'S2',
  },
  {
    id: 'S4',
    flow: 'single',
    title: 'Print the single design',
    gate: { kind: 'all', keys: [CHECKS.printed], reason: 'Confirm that the print is done.' },
    next: 'S5',
    back: 'S3',
  },
  {
    id: 'S5',
    flow: 'single',
    title: 'Measure the beam',
    gate: { kind: 'measurements', axes: ['X'] },
    next: 'S6',
    back: 'S4',
  },
  {
    id: 'S6',
    flow: 'single',
    title: 'Your slicer setting',
    gate: { kind: 'measurements', axes: ['X'] },
    next: null,
    // No Back, matching the quad flow's results step: this is the last screen of
    // the flow, and Finish is the way out of it.
    back: null,
    // The flow ends here, exactly as the quad flow's does (decision 28).
    finishes: true,
    nextLabel: 'Finish',
    showExit: false,
  },
]

/**
 * The common steps are shared, so they are registered once per flow with the
 * flow's own ids for `next`/`back` patched in below rather than duplicated.
 */
const COMMON_FOR_SINGLE: readonly StepSpec[] = [
  { ...COMMON_STEPS[0], flow: 'single', next: 'C2' },
  { ...COMMON_STEPS[1], flow: 'single', next: null, back: 'C1' },
]

const REGISTRY = register([...COMMON_STEPS, ...COMMON_FOR_SINGLE, ...QUAD_STEPS, ...SINGLE_STEPS])

/** The step map for tests and for the renderer. */
export function stepRegistry(): ReadonlyMap<StepId, RegisteredStep> {
  return REGISTRY
}

export function stepById(id: StepId): RegisteredStep {
  const step = REGISTRY.get(id)
  if (step === undefined) {
    throw new Error(`Unknown step: ${id}`)
  }
  return step
}

/**
 * Which flow a step's *instructions* belong to, from its id prefix.
 *
 * C1 and C2 are shared, and report `quad` only because the shared steps precede
 * both branches; the flow a run is actually following is decided at C2 and lives
 * on the draft.
 */
export function flowOf(id: StepId): FlowId {
  return id.startsWith('S') ? 'single' : 'quad'
}

export interface FlowDefinition {
  readonly id: FlowId
  /** Steps in order, including the shared common steps. */
  readonly steps: readonly StepId[]
  /** The entry points offered on the landing screen's branch step. */
  readonly firstInstructionalStep: StepId
  /** Where the calibration result is shown. */
  readonly resultsStep: StepId
  /** The flow's final step, whose action returns to the landing screen. */
  readonly lastStep: StepId
}

export const FLOW_DEFINITIONS: Readonly<Record<FlowId, FlowDefinition>> = {
  quad: {
    id: 'quad',
    steps: ['C1', 'C2', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'],
    firstInstructionalStep: 'Q1',
    resultsStep: 'Q8',
    lastStep: 'Q8',
  },
  single: {
    id: 'single',
    steps: ['C1', 'C2', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    firstInstructionalStep: 'S1',
    resultsStep: 'S6',
    lastStep: 'S6',
  },
}

/**
 * Where a run starts, given the persisted prerequisites flag (PRD §9.2).
 *
 * C1 is skipped silently once the flag is set, which is why the flag's reset
 * lives on the printer-data screen: without that control, the checklist content
 * would be unreachable forever.
 *
 * Both flows begin with the same two common steps, so the branch is not chosen
 * until C2 and the entry point does not depend on it.
 */
export function entryStep(skipPrerequisites: boolean): StepId {
  return skipPrerequisites ? 'C2' : 'C1'
}

/**
 * Where Next goes from C2 — the one step whose destination is the user's answer
 * rather than the registry's order.
 */
export function branchTarget(choice: { readonly firstTime: boolean }): {
  readonly flow: FlowId
  readonly step: StepId
} {
  return choice.firstTime
    ? { flow: 'quad', step: FLOW_DEFINITIONS.quad.firstInstructionalStep }
    : { flow: 'single', step: FLOW_DEFINITIONS.single.firstInstructionalStep }
}
