import type { Accessor } from 'solid-js'
import type {
  ActiveCalibration,
  BeamInput,
  PersistedState,
  PrerequisiteState,
  Printer,
  QuadInput,
  SingleInput,
  TuningState,
} from './types.ts'

export type QuadAxis = 'x' | 'y' | 'a' | 'b'

// Everything a screen may read or call. The top-level App owns all durable state;
// screens are stateless apart from transient input/modal state.
export interface AppApi {
  printers: Accessor<Printer[]>
  skipEquipment: Accessor<boolean>
  storageWarning: Accessor<string | null>
  active: Accessor<ActiveCalibration | null>
  screen: Accessor<string>

  startQuad: () => void
  startSingle: () => void
  openPrinters: () => void
  openAbout: () => void
  back: () => void
  requestExit: () => void
  finish: () => void

  updateEquipment: (patch: Partial<PrerequisiteState>) => void
  updateTuning: (patch: Partial<TuningState>) => void
  updateQuad: (patch: Partial<QuadInput>) => void
  updateQuadBeam: (axis: QuadAxis, patch: Partial<BeamInput>) => void
  updateSingle: (patch: Partial<SingleInput>) => void
  updateSingleBeam: (patch: Partial<BeamInput>) => void
  selectPrinter: (name: string) => void
  setStep: (step: string) => void

  setSkipEquipment: (value: boolean) => void
  replacePrinters: (printers: Printer[]) => void
  saveQuadPrinter: (name: string, factor: number) => void
}

export type Persisted = PersistedState
