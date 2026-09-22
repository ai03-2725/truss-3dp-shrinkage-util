import {
  AXES,
  DESIGN_LENGTH_MM,
  FACTOR_DP,
  FINAL_DP,
  RATIO_DP,
} from './constants'
import type { MeasurementState } from './types'

/** Arithmetic mean. Returns NaN for an empty list. */
export function average(values: number[]): number {
  if (values.length === 0) return Number.NaN
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function axisValues(
  measurements: MeasurementState,
  axis: keyof MeasurementState,
): number[] {
  const pair = measurements[axis]
  return [pair.outer, pair.inner].filter((v): v is number => v !== null)
}

/** All entered measurements across every axis, in X/Y/A/B order. */
export function allMeasurements(measurements: MeasurementState): number[] {
  return AXES.flatMap((axis) => axisValues(measurements, axis))
}

/** avg(all 8) / avg(X outer, X inner). PRD §13.1. */
export function quadExtrapolationFactor(
  measurements: MeasurementState,
): number {
  return (
    average(allMeasurements(measurements)) /
    average(axisValues(measurements, 'X'))
  )
}

/** avg(all 8) / 140. PRD §13.2. */
export function quadCompensationRatio(measurements: MeasurementState): number {
  return average(allMeasurements(measurements)) / DESIGN_LENGTH_MM
}

/** ((inner + outer) / 2 / 140) × factor. PRD §13.3. */
export function singleExtrapolatedRatio(
  inner: number,
  outer: number,
  factor: number,
): number {
  return ((inner + outer) / 2 / DESIGN_LENGTH_MM) * factor
}

/** current XY % × compensation ratio. PRD §13.4. */
export function finalShrinkagePercent(
  currentPercent: number,
  ratio: number,
): number {
  return currentPercent * ratio
}

/** Round to `dp` decimals, dropping insignificant trailing zeros. */
function formatDp(value: number, dp: number): string {
  if (!Number.isFinite(value)) return ''
  return value
    .toFixed(dp)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '')
}

export function format5dp(value: number): string {
  return formatDp(value, FACTOR_DP)
}

export function format4dp(value: number): string {
  return formatDp(value, FINAL_DP)
}

export function formatRatio(value: number): string {
  return formatDp(value, RATIO_DP)
}
