// Shared vocabulary for the whole app (PRD §6, §7). Types and constants only;
// no logic belongs here.

/** A saved printer with its full-precision extrapolation factor. */
export interface Printer {
  name: string
  extrapolationFactor: number
}

/** Shape persisted under the printers localStorage key. */
export interface PrintersStore {
  version: number
  printers: Printer[]
}

/** User preferences persisted under the prefs localStorage key. */
export interface Prefs {
  skipPrerequisiteCheck: boolean
}

/** The four truss axes. */
export type Axis = 'X' | 'Y' | 'A' | 'B'

/** Outer or inner caliper measurement. */
export type Side = 'outer' | 'inner'

/** Flat measurement key, e.g. `XOuter` or `BInner`. */
export type MeasurementKey = `${Axis}${Capitalize<Side>}`

/**
 * In-progress measurements for the active flow. Values are parsed numbers in
 * millimetres; absent keys are not yet entered.
 */
export type MeasurementState = Partial<Record<MeasurementKey, number>>

/** Every screen the root component can render. No router (PRD §8). */
export type ScreenId =
  | 'Home'
  | 'ManagePrinters'
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'Q4'
  | 'Q5'
  | 'Q6'
  | 'Q7'
  | 'Q8'
  | 'Q9'
  | 'S1'
  | 'S2'
  | 'S3'
  | 'S4'
  | 'S5'
  | 'S6'
