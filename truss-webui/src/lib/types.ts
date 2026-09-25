// Minimal shared data shapes. Raw measurement/percentage values stay as strings
// until validation so partial typing and refresh/resume work.

export interface Printer {
  name: string
  extrapolationFactor: number
}

export interface BeamInput {
  outer: string
  inner: string
}

export interface QuadInput {
  x: BeamInput
  y: BeamInput
  a: BeamInput
  b: BeamInput
  printerName: string
  currentXY: string
}

export interface SingleInput {
  outer: string
  inner: string
  currentXY: string
}

export interface PrerequisiteState {
  calipers: boolean
  printer: boolean
  slicer: boolean
}

export interface TuningState {
  temperature: boolean
  pressure: boolean
  flow: boolean
}

export type FlowKind = 'quad' | 'single'

// The whole in-progress calibration. Persisted as it changes so a refresh resumes.
export interface ActiveCalibration {
  flow: FlowKind
  step: string
  selectedPrinterName: string
  equipment: PrerequisiteState
  tuning: TuningState
  quadSaveFailed: boolean
  quad: QuadInput
  single: SingleInput
}

export interface PersistedState {
  printers: Printer[]
  skipEquipment: boolean
  active: ActiveCalibration | null
}

export function emptyQuad(): QuadInput {
  return {
    x: { outer: '', inner: '' },
    y: { outer: '', inner: '' },
    a: { outer: '', inner: '' },
    b: { outer: '', inner: '' },
    printerName: '',
    currentXY: '100',
  }
}

export function emptySingle(): SingleInput {
  return { outer: '', inner: '', currentXY: '100' }
}

export function emptyEquipment(): PrerequisiteState {
  return { calipers: false, printer: false, slicer: false }
}

export function emptyTuning(): TuningState {
  return { temperature: false, pressure: false, flow: false }
}
