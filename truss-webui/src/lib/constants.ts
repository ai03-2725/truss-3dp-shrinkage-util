import type { Axis, MeasurementState } from './types'

/** Designed beam length in millimeters. PRD §6, §13. */
export const DESIGN_LENGTH_MM = 140

/** Soft measurement warning bounds (non-blocking). PRD §14. */
export const WARN_MIN_MM = 135
export const WARN_MAX_MM = 142

/** Soft extrapolation-factor warning bounds (non-blocking). PRD §14. */
export const FACTOR_WARN_MIN = 0.9
export const FACTOR_WARN_MAX = 1.1

/** Display precisions. PRD §13. */
export const FACTOR_DP = 5
export const RATIO_DP = 5
export const FINAL_DP = 4

/** localStorage keys. PRD §7. */
export const STORAGE_KEYS = {
  printers: 'truss-calibrator.printers.v1',
  prefs: 'truss-calibrator.prefs.v1',
} as const

/** Schema version for stored/exported data. PRD §7. */
export const STORE_VERSION = 1

export const AXES: readonly Axis[] = ['X', 'Y', 'A', 'B']

/** A fresh, empty measurement record. */
export function createEmptyMeasurements(): MeasurementState {
  return {
    X: { outer: null, inner: null },
    Y: { outer: null, inner: null },
    A: { outer: null, inner: null },
    B: { outer: null, inner: null },
  }
}
