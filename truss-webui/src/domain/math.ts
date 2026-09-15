import type { CalibrationDraft } from './draft'
import { formatFactor, formatMeasurement, formatRatio, parseNumber } from './number'
import {
  AXES,
  DESIGNED_LENGTH_MM,
  type AxisId,
  type AxisPair,
  type Measurement,
  type MeasurementSide,
} from './types'

/**
 * The calculation engine (PRD §8.1).
 *
 * Both flows are **one** computation with a different measurement basis:
 *
 *     R = F × (basis / 140)
 *
 * The guides phrase the quad flow as `v̄8 / 140` and the single flow as
 * `(v̄2 / 140) × F`. Those are algebraically identical because multiplication
 * commutes — which is exactly why they are dangerous: an implementation that
 * evaluates each flow in "its own" order from its own guide can drift, and the
 * drift is invisible, because both produce a plausible number near 0.98.
 *
 * So there is precisely one evaluation order here:
 *
 *     extrapolatedAverage = <the beam-spanning average for this flow>
 *     ratio               = extrapolatedAverage / 140
 *
 * The *only* flow-specific input is what that extrapolated average is:
 *
 *   - quad:   `v̄8` — a quad print needs no extrapolation, it *is* the four-axis
 *             measurement. (Note it deliberately does not route through
 *             `v̄X × (v̄8 / v̄X)`: that product is not bit-exact in floating point
 *             and would make the ratio depend on which flow computed it.)
 *   - single: `v̄2 × F` — the whole point of the stored factor.
 *
 * Rounded output is *reported alongside* the full-precision values by
 * {@link evaluateQuad} / {@link evaluateSingle}, never substituted for them, so
 * a caller cannot compute the percentage from a rounded ratio (PRD §8.2).
 */

/** The slicer's XY shrinkage default, offered as the starting value (PRD §10). */
export const DEFAULT_CURRENT_SLICER_PERCENT = 100

/* -------------------------------------------------------------------------- */
/* Reading a draft                                                             */
/* -------------------------------------------------------------------------- */

/** A slot that cannot be used yet, with the text that is currently in it. */
export interface PendingSlot {
  readonly axis: AxisId
  readonly side: MeasurementSide
  readonly text: string
}

/**
 * The result of reading a draft's measurements.
 *
 * `pending` is non-empty when any slot is empty, non-numeric, non-finite, or
 * ≤ 0 — the blocking rules of PRD §8.3. Reporting *which* slots are missing
 * (rather than a bare boolean) is what lets a step gate disable Next and name
 * what it is still waiting for.
 */
export type MeasurementsRead =
  | { readonly ok: true; readonly pairs: readonly AxisPair[]; readonly values: readonly number[] }
  | { readonly ok: false; readonly pending: readonly PendingSlot[] }

type SideRead =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly pending: PendingSlot }

function readSide(axis: AxisId, side: MeasurementSide, text: string): SideRead {
  const parsed = parseNumber(text)
  if (!parsed.ok || !(parsed.value > 0)) {
    return { ok: false, pending: { axis, side, text } }
  }
  return { ok: true, value: parsed.value }
}

/**
 * Read every requested axis, in order, returning either all of the measurements
 * or the exact set of slots still needed.
 *
 * All-or-nothing on purpose: a partially-read set would let a caller average
 * however many values happened to be valid, which is precisely the silent
 * arithmetic error this app exists to eliminate.
 */
export function readMeasurements(
  draft: CalibrationDraft,
  axes: readonly AxisId[],
): MeasurementsRead {
  const pending: PendingSlot[] = []
  const pairs: AxisPair[] = []
  const values: number[] = []

  for (const axis of axes) {
    const entry = draft.entries[axis]
    const outer = readSide(axis, 'outer', entry.outer)
    const inner = readSide(axis, 'inner', entry.inner)

    if (!outer.ok) pending.push(outer.pending)
    if (!inner.ok) pending.push(inner.pending)
    if (!outer.ok || !inner.ok) continue

    pairs.push({ axis, outer: outer.value, inner: inner.value })
    values.push(outer.value, inner.value)
  }

  if (pending.length > 0) {
    return { ok: false, pending }
  }
  return { ok: true, pairs, values }
}

/** Every measurement across a set of axes, flattened in axis-then-side order. */
export function measurementsOf(pairs: readonly AxisPair[]): readonly Measurement[] {
  const out: Measurement[] = []
  for (const pair of pairs) {
    out.push({ axis: pair.axis, side: 'outer', value: pair.outer })
    out.push({ axis: pair.axis, side: 'inner', value: pair.inner })
  }
  return out
}

/* -------------------------------------------------------------------------- */
/* Value-level math                                                            */
/* -------------------------------------------------------------------------- */

/** Arithmetic mean. An empty list yields `NaN`; completeness is a gate's job. */
export function average(values: readonly number[]): number {
  let sum = 0
  for (const value of values) {
    sum += value
  }
  return sum / values.length
}

/** The mean of one axis's two readings — the basis for both flows' averaging. */
export function pairAverage(pair: AxisPair): number {
  return average([pair.outer, pair.inner])
}

/** The mean of all readings across the given axes (8 for quad, 2 for single). */
export function meanOfPairs(pairs: readonly AxisPair[]): number {
  return average(measurementsOf(pairs).map((measurement) => measurement.value))
}

/** The quad flow's basis: the X beam's own average (PRD §8.1). */
export function quadBasisFromPairs(pairs: readonly AxisPair[]): number {
  const x = pairs.find((pair) => pair.axis === 'X')
  if (x === undefined) {
    throw new Error('quadBasisFromPairs requires an X pair')
  }
  return pairAverage(x)
}

/**
 * The printer's four-axis extrapolation factor: `v̄8 / v̄X` (PRD §8.1).
 *
 * This is the only flow-specific *division*, and the single flow never performs
 * it — it reads the stored result — which is what keeps the two flows from
 * disagreeing about what the factor means.
 */
export function quadFactorFromPairs(pairs: readonly AxisPair[]): number {
  return meanOfPairs(pairs) / quadBasisFromPairs(pairs)
}

/**
 * The one place a compensation ratio is produced: divide the extrapolated
 * average by the designed length. See the module comment for why nothing else
 * divides by 140.
 */
export function ratioFromExtrapolatedAverage(extrapolatedAverage: number): number {
  return extrapolatedAverage / DESIGNED_LENGTH_MM
}

/** `v̄8 / 140` for a complete quad measurement set. */
export function quadRatioFromPairs(pairs: readonly AxisPair[]): number {
  return ratioFromExtrapolatedAverage(meanOfPairs(pairs))
}

/**
 * The predicted quad-beam average from a single-beam print:
 * `v̄2 × F` (PRD §8.1).
 */
export function singleExtrapolatedAverage(pair: AxisPair, factor: number): number {
  return pairAverage(pair) * factor
}

/** `(v̄2 × F) / 140`, evaluated in the canonical order. */
export function singleRatio(pair: AxisPair, factor: number): number {
  return ratioFromExtrapolatedAverage(singleExtrapolatedAverage(pair, factor))
}

/**
 * `current slicer value × R`, at full precision (PRD §8.2, §10).
 *
 * The percentage is the one value the user transcribes, so it is computed from
 * the full-precision ratio every time it is shown — never from the rounded
 * ratio that sits next to it on screen.
 */
export function applyCurrentSlicerValue(currentPercent: number, ratio: number): number {
  return currentPercent * ratio
}

/* -------------------------------------------------------------------------- */
/* Draft-level entry points (T06.6)                                            */
/* -------------------------------------------------------------------------- */

/** Full-precision values paired with the rounded strings used to display them. */
export interface OutcomeDisplay {
  /** Mean of every reading (8 in quad, 2 in single). */
  readonly mean: string
  /** The flow's basis: `v̄X` in quad, `v̄2` in single. */
  readonly basis: string
  /** The extrapolation factor — measured in quad, stored in single. */
  readonly factor: string
  /** Shrinkage compensation ratio. */
  readonly ratio: string
}

interface OutcomeBase {
  readonly pairs: readonly AxisPair[]
  /** Mean of every reading. */
  readonly mean: number
  /** The flow's measurement basis. */
  readonly basis: number
  readonly factor: number
  /** The value divided by 140 (PRD §8.1's canonical order). */
  readonly extrapolatedAverage: number
  readonly ratio: number
  readonly display: OutcomeDisplay
}

export interface QuadOutcome extends OutcomeBase {
  readonly flow: 'quad'
}

export interface SingleOutcome extends OutcomeBase {
  readonly flow: 'single'
}

export type CalibrationOutcome = QuadOutcome | SingleOutcome

function displayFor(mean: number, basis: number, factor: number, ratio: number): OutcomeDisplay {
  return {
    mean: formatMeasurement(mean),
    basis: formatMeasurement(basis),
    factor: formatFactor(factor),
    ratio: formatRatio(ratio),
  }
}

/** Evaluate a complete quad draft, or `null` while any reading is missing. */
export function evaluateQuad(draft: CalibrationDraft): QuadOutcome | null {
  const read = readMeasurements(draft, AXES)
  if (!read.ok) {
    return null
  }

  const mean = meanOfPairs(read.pairs)
  const basis = quadBasisFromPairs(read.pairs)
  const factor = mean / basis
  const ratio = ratioFromExtrapolatedAverage(mean)

  return {
    flow: 'quad',
    pairs: read.pairs,
    mean,
    basis,
    factor,
    extrapolatedAverage: mean,
    ratio,
    display: displayFor(mean, basis, factor, ratio),
  }
}

/**
 * Evaluate a complete single draft against a stored factor, or `null` while
 * either reading is missing.
 *
 * The factor is passed in rather than looked up so that this stays pure and the
 * cross-flow equivalence property can be tested directly.
 */
export function evaluateSingle(draft: CalibrationDraft, factor: number): SingleOutcome | null {
  const read = readMeasurements(draft, ['X'])
  if (!read.ok) {
    return null
  }

  const pair = read.pairs[0]
  const mean = pairAverage(pair)
  const extrapolatedAverage = mean * factor
  const ratio = ratioFromExtrapolatedAverage(extrapolatedAverage)

  return {
    flow: 'single',
    pairs: read.pairs,
    mean,
    basis: mean,
    factor,
    extrapolatedAverage,
    ratio,
    display: displayFor(mean, mean, factor, ratio),
  }
}

/* -------------------------------------------------------------------------- */
/* Draft-level convenience (naming fixed by the build plan)                    */
/* -------------------------------------------------------------------------- */

/** `v̄X`, or `null` while the X readings are incomplete. */
export function quadBasis(draft: CalibrationDraft): number | null {
  const read = readMeasurements(draft, AXES)
  return read.ok ? quadBasisFromPairs(read.pairs) : null
}

/** `v̄8 / v̄X`, or `null` while any reading is incomplete. */
export function quadFactor(draft: CalibrationDraft): number | null {
  return evaluateQuad(draft)?.factor ?? null
}

/** `v̄8 / 140`, or `null` while any reading is incomplete. */
export function quadRatio(draft: CalibrationDraft): number | null {
  return evaluateQuad(draft)?.ratio ?? null
}
