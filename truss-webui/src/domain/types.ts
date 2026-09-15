/**
 * Core domain vocabulary.
 *
 * Everything the math, storage, and UI layers agree on lives here, so that the
 * PRD's invariants are stated once. Where an invariant can be carried by a type
 * it is, rather than being restated in a doc comment that nothing enforces.
 */

/* -------------------------------------------------------------------------- */
/* Persistence                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Namespaced local-storage keys.
 *
 * **Frozen.** Renaming these after the first ship orphans every stored printer
 * (PRD §7, §13.7). The `v1` segment is a coarse namespace: a future incompatible
 * change ships as `v2` alongside, leaving `v1` data readable rather than
 * silently reinterpreted.
 */
export const STORAGE_KEY_PRINTERS = 'truss-calibrator:v1:printers'
export const STORAGE_KEY_SETTINGS = 'truss-calibrator:v1:settings'

/** The only payload version this build can read (PRD §7). */
export const PAYLOAD_VERSION = 1

/**
 * A saved printer.
 *
 * `name` is the identity — trimmed, non-empty, unique case-insensitively — and
 * is deliberately the *only* identity, so exported JSON stays human-readable
 * and hand-editable (PRD §7, decision 5).
 */
export interface PrinterRecord {
  readonly name: string
  /** Finite and positive; derived from a quad calibration (PRD §7). */
  readonly extrapolationFactor: number
}

/** Envelope stored under {@link STORAGE_KEY_PRINTERS}. */
export interface PrintersPayload {
  readonly version: number
  readonly printers: readonly PrinterRecord[]
}

/** App state that is not printer data, and so is never exported (PRD §11.3). */
export interface SettingsState {
  /** When set, the prerequisites step is skipped on subsequent runs. */
  readonly skipPrerequisites: boolean
}

/** Envelope stored under {@link STORAGE_KEY_SETTINGS}. */
export interface SettingsPayload extends SettingsState {
  readonly version: number
}

export const DEFAULT_SETTINGS: SettingsState = { skipPrerequisites: false }

/* -------------------------------------------------------------------------- */
/* Calibration geometry                                                        */
/* -------------------------------------------------------------------------- */

/** The designed length of every beam, in millimetres (PRD §8.1). */
export const DESIGNED_LENGTH_MM = 140

/**
 * The four measured axes, in the order the guides introduce them.
 *
 * The order is load-bearing: the quad flow's measurement steps walk it, and the
 * fixtures in PRD §14.1 are expressed in it.
 */
export const AXES = ['X', 'Y', 'A', 'B'] as const

export type AxisId = (typeof AXES)[number]

/** Which set of caliper teeth produced a reading, for one axis (PRD §8.1). */
export const SIDES = ['outer', 'inner'] as const

export type MeasurementSide = (typeof SIDES)[number]

/** One caliper reading, in millimetres. */
export interface Measurement {
  readonly axis: AxisId
  readonly side: MeasurementSide
  readonly value: number
}

/**
 * The outer and inner reading for one axis, after parsing.
 *
 * This — not a bare list of eight numbers — is the unit the math layer consumes,
 * because the quad basis is *specifically* the X pair's average and a flat list
 * would let a caller substitute the wrong pair without the type noticing.
 */
export interface AxisPair {
  readonly axis: AxisId
  readonly outer: number
  readonly inner: number
}

/* -------------------------------------------------------------------------- */
/* Flows                                                                       */
/* -------------------------------------------------------------------------- */

/** The two calibration flows (PRD §9.3, §9.4). */
export const FLOWS = ['quad', 'single'] as const

export type FlowId = (typeof FLOWS)[number]

/** The axes a flow collects measurements for. */
export function axesForFlow(flow: FlowId): readonly AxisId[] {
  return flow === 'quad' ? AXES : ['X']
}
