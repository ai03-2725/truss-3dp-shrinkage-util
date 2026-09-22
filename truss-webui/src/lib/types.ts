// Shared domain vocabulary. Types only — no logic. See PRD §6, §7.

/** A saved printer: name is the case-insensitive primary key. */
export interface Printer {
  name: string
  extrapolationFactor: number
}

/** Shape persisted under STORAGE_KEYS.printers. See PRD §7.1. */
export interface PrintersStore {
  version: number
  printers: Printer[]
}

/** Shape persisted under STORAGE_KEYS.prefs. See PRD §7.2. */
export interface Prefs {
  skipPrerequisiteCheck: boolean
}

/** The four beams of the Quad calibrator. */
export type Axis = 'X' | 'Y' | 'A' | 'B'

/** Outer/inner caliper readings for one beam. Null = not yet entered. */
export interface MeasurementPair {
  outer: number | null
  inner: number | null
}

/** In-progress measurements held by the root component. */
export type MeasurementState = Record<Axis, MeasurementPair>

/** Every screen the app can show. No router — a signal selects one. */
export type ScreenId =
  | 'home'
  | 'managePrinters'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'q5'
  | 'q6'
  | 'q7'
  | 'q8'
  | 'q9'
  | 's1'
  | 's2'
  | 's3'
  | 's4'
  | 's5'
  | 's6'
