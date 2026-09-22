import type { Axis, MeasurementKey, Side } from './types'

/** Designed beam length in millimetres (PRD §13). */
export const DESIGN_LENGTH_MM = 140

/** Soft-warning measurement bounds in millimetres (PRD §14). */
export const WARN_MIN_MM = 135
export const WARN_MAX_MM = 142

/** Soft-warning bounds for a manually entered extrapolation factor (PRD §14). */
export const FACTOR_WARN_MIN = 0.9
export const FACTOR_WARN_MAX = 1.1

/** localStorage keys (PRD §7). */
export const PRINTERS_STORAGE_KEY = 'truss-calibrator.printers.v1'
export const PREFS_STORAGE_KEY = 'truss-calibrator.prefs.v1'

/** Schema version written to storage / exported JSON. */
export const STORE_VERSION = 1

/** Display precision (PRD §13). */
export const PRECISION_5DP = 5
export const PRECISION_4DP = 4

/** Default slicer XY shrinkage percentage. */
export const DEFAULT_CURRENT_XY_PERCENT = 100

/** External links shown on Home (PRD §11). */
export const GITHUB_URL =
  'https://github.com/ai03-2725/truss-3dp-shrinkage-util'
export const DOCS_URL =
  'https://github.com/ai03-2725/truss-3dp-shrinkage-util/tree/main/Documentation'

/** Axes in the order the flows present them. */
export const AXES: Axis[] = ['X', 'Y', 'A', 'B']
export const SIDES: Side[] = ['outer', 'inner']

/** All eight quadratic measurement keys, X first. */
export const QUAD_MEASUREMENT_KEYS: MeasurementKey[] = AXES.flatMap((axis) => [
  `${axis}Outer` as MeasurementKey,
  `${axis}Inner` as MeasurementKey,
])
