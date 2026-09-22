import {
  DESIGN_LENGTH_MM,
  PRECISION_4DP,
  PRECISION_5DP,
  QUAD_MEASUREMENT_KEYS,
} from './constants'
import type { MeasurementState } from './types'

/**
 * Pure calculation helpers (PRD §13). All math uses full-precision inputs;
 * rounding happens only in the display formatters.
 */

/** Arithmetic mean. Returns NaN for an empty list. */
export function average(values: number[]): number {
  if (values.length === 0) return Number.NaN
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function allMeasurements(measurements: MeasurementState): number[] {
  return QUAD_MEASUREMENT_KEYS.map((key) => measurements[key]).filter(
    (value): value is number => typeof value === 'number',
  )
}

function xAverage(measurements: MeasurementState): number {
  return average([measurements.XOuter as number, measurements.XInner as number])
}

/** avg(all 8) / avg(X outer, X inner) — the printer's extrapolation factor. */
export function quadExtrapolationFactor(
  measurements: MeasurementState,
): number {
  return average(allMeasurements(measurements)) / xAverage(measurements)
}

/** avg(all 8) / 140 — the Quad-beam compensation ratio. */
export function quadCompensationRatio(measurements: MeasurementState): number {
  return average(allMeasurements(measurements)) / DESIGN_LENGTH_MM
}

/** ((inner + outer) / 2 / 140) × factor — the extrapolated Single ratio. */
export function singleExtrapolatedRatio(
  inner: number,
  outer: number,
  factor: number,
): number {
  return ((inner + outer) / 2 / DESIGN_LENGTH_MM) * factor
}

/** current XY % × compensation ratio — the final slicer value. */
export function finalShrinkagePercent(
  currentPercent: number,
  ratio: number,
): number {
  return currentPercent * ratio
}

/** Round to `dp` decimal places. */
export function roundTo(value: number, dp: number): number {
  const factor = 10 ** dp
  return Math.round(value * factor) / factor
}

function formatDp(value: number, dp: number): string {
  if (!Number.isFinite(value)) return ''
  return value.toFixed(dp).replace(/\.?0+$/, '')
}

/** Factor / compensation ratio display (max 5 dp, no trailing zeros). */
export function format5dp(value: number): string {
  return formatDp(value, PRECISION_5DP)
}

/** Final slicer value display (max 4 dp, no trailing zeros). */
export function format4dp(value: number): string {
  return formatDp(value, PRECISION_4DP)
}
