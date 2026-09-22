import type { Accessor } from 'solid-js'
import type { Axis, MeasurementState, Prefs, Printer, ScreenId } from './types'

/** Key for one half of a beam measurement. */
export type MeasurementKey = 'outer' | 'inner'

/**
 * The single state manager exposed to every screen. App.tsx owns the signals;
 * screens read them and call these actions. PRD §8.
 */
export interface AppStore {
  /* State */
  screen: Accessor<ScreenId>
  printers: Accessor<Printer[]>
  prefs: Accessor<Prefs>
  measurements: Accessor<MeasurementState>
  selectedPrinter: Accessor<Printer | null>
  storageUnavailable: Accessor<boolean>
  printersCorrupt: Accessor<boolean>
  persistError: Accessor<boolean>
  exitOpen: Accessor<boolean>

  /* Navigation */
  go: (screen: ScreenId) => void
  back: () => void
  requestExit: () => void
  confirmExit: () => void
  cancelExit: () => void
  finishFlow: () => void

  /* Measurements */
  resetMeasurements: () => void
  setMeasurement: (axis: Axis, key: MeasurementKey, value: number) => void

  /* Single flow */
  selectPrinter: (printer: Printer) => void

  /* Printer mutations (persist immediately) */
  addPrinter: (printer: Printer) => void
  updatePrinter: (originalName: string, printer: Printer) => void
  deletePrinter: (name: string) => void
  setPrintersFromImport: (printers: Printer[]) => void

  /* Preferences */
  setSkipPrerequisiteCheck: (value: boolean) => void
}
