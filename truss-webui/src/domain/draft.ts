import { AXES, type AxisId, type FlowId, type MeasurementSide } from './types'

/**
 * The in-memory calibration draft (PRD §9.3, decision 2).
 *
 * One draft object is shared by every step of a flow, so Back is free and Next
 * only has to decide whether the step's gate is satisfied. It is deliberately
 * *not* persisted: closing or reloading restarts the flow at step 1 (decision 1,
 * decision 2's accepted limitation in §12).
 *
 * Values are held as **the text the user typed**, not as numbers. Parsing a
 * number and re-rendering it fights the keyboard mid-edit — `137.` and `137,0`
 * are legitimate intermediate states that a numeric round trip would rewrite
 * under the cursor. Parsing happens where a value is consumed (gates, math), so
 * a half-typed value blocks Next exactly as an empty one does while the text the
 * user typed is preserved for them to finish.
 */

/** The outer and inner readings for one axis, as typed. */
export interface AxisEntry {
  readonly outer: string
  readonly inner: string
}

export interface CalibrationDraft {
  /** Which flow this draft belongs to; fixed at flow entry. */
  readonly flow: FlowId
  /** Printer chosen in the quick flow's first step, if any. */
  readonly printerName: string | null
  /** All four axes are present regardless of flow, so step code needs no special cases. */
  readonly entries: Readonly<Record<AxisId, AxisEntry>>
  /** The slicer's current XY shrinkage value, as typed ('' until entered). */
  readonly currentSlicerPercent: string
  /**
   * Tick-box and confirmation state, keyed by a stable string.
   *
   * Checkbox state belongs in the draft rather than in each step's component for
   * one load-bearing reason: **step gates are predicates over the draft**. If a
   * step kept its own "all three ticked" state, the gate could not see it without
   * the step reaching back into the engine, and the two could disagree. It also
   * makes Back navigation preserve the ticks for free, which is what a user who
   * went back to re-read something expects.
   */
  readonly checks: Readonly<Record<string, boolean>>
}

const EMPTY_ENTRY: AxisEntry = { outer: '', inner: '' }

export function emptyEntry(): AxisEntry {
  return EMPTY_ENTRY
}

/**
 * A fresh draft for `flow`.
 *
 * Every flow entry point calls this, which is what makes "flow re-entry resets
 * the draft" (T15.3) a property of construction rather than something each entry
 * point has to remember.
 */
export function createDraft(flow: FlowId): CalibrationDraft {
  return {
    flow,
    printerName: null,
    entries: { X: EMPTY_ENTRY, Y: EMPTY_ENTRY, A: EMPTY_ENTRY, B: EMPTY_ENTRY },
    currentSlicerPercent: '',
    checks: {},
  }
}

/** The tick-box keys the flows use. Named here so steps cannot invent typos. */
export const CHECKS = {
  /** C1 prerequisites. */
  caliper: 'prereq.caliper',
  printer: 'prereq.printer',
  slicer: 'prereq.slicer',
  /** C2 branch choice; exactly one is set. */
  firstTime: 'branch.firstTime',
  returning: 'branch.returning',
  /** S1 printer selection. */
  printerSelected: 'printer.selected',
  /** Filament prerequisites, Q1 and S2. */
  filamentTemperature: 'filament.temperature',
  filamentPressureAdvance: 'filament.pressureAdvance',
  filamentFlowRate: 'filament.flowRate',
  /** Confirmations. */
  sliced: 'step.sliced',
  printed: 'step.printed',
  /** Q7's mandatory save gate. */
  printerSaved: 'printer.saved',
} as const

export function isChecked(draft: CalibrationDraft, key: string): boolean {
  return draft.checks[key] === true
}

export function setChecked(draft: CalibrationDraft, key: string, value: boolean): CalibrationDraft {
  return { ...draft, checks: { ...draft.checks, [key]: value } }
}

/**
 * Set one of a mutually exclusive group of checks, clearing the others.
 *
 * A branch choice is not a checkbox: ticking "yes" has to untick "no", or the
 * gate would be satisfied by a stale answer the user can no longer see.
 */
export function chooseExclusively(
  draft: CalibrationDraft,
  key: string,
  group: readonly string[],
): CalibrationDraft {
  const checks = { ...draft.checks }
  for (const member of group) {
    delete checks[member]
  }
  checks[key] = true
  return { ...draft, checks }
}

export function entryFor(draft: CalibrationDraft, axis: AxisId): AxisEntry {
  return draft.entries[axis]
}

/** Record one typed reading, leaving the other five/seven untouched. */
export function setMeasurement(
  draft: CalibrationDraft,
  axis: AxisId,
  side: MeasurementSide,
  text: string,
): CalibrationDraft {
  const current = draft.entries[axis]
  return {
    ...draft,
    entries: { ...draft.entries, [axis]: { ...current, [side]: text } },
  }
}

export function setCurrentSlicerPercent(draft: CalibrationDraft, text: string): CalibrationDraft {
  return { ...draft, currentSlicerPercent: text }
}

export function setPrinterName(draft: CalibrationDraft, name: string | null): CalibrationDraft {
  return { ...draft, printerName: name }
}

/**
 * Whether the user has entered *anything* at all.
 *
 * This is what the exit confirmation is honest *about* (PRD §9.3): it asks "has
 * the user done work that would be lost", so it counts non-blank text rather
 * than valid numbers. Someone who typed a reading and then wants to leave is
 * told it will be discarded even if what they typed is currently invalid — which
 * is exactly when losing it would sting most. The confirmation itself appears
 * either way; only its wording changes.
 */
export function hasAnyMeasurementText(draft: CalibrationDraft): boolean {
  return AXES.some((axis) => {
    const entry = draft.entries[axis]
    return entry.outer.trim() !== '' || entry.inner.trim() !== ''
  })
}
