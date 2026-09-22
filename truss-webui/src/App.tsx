import { type Component, createSignal, onMount, Show } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { Button, Modal, Notice } from './components/ui'
import type { AppStore, MeasurementKey } from './lib/appState'
import { createEmptyMeasurements } from './lib/constants'
import {
  isStorageAvailable,
  loadPrefs,
  loadPrinters,
  savePrefs,
  savePrinters,
} from './lib/storage'
import type {
  Axis,
  MeasurementState,
  Prefs,
  Printer,
  ScreenId,
} from './lib/types'
import Home from './pages/Home'
import ManagePrinters from './pages/ManagePrinters'
import Q1 from './pages/quad/Q1'
import Q2 from './pages/quad/Q2'
import Q3 from './pages/quad/Q3'
import Q4 from './pages/quad/Q4'
import Q5 from './pages/quad/Q5'
import Q6 from './pages/quad/Q6'
import Q7 from './pages/quad/Q7'
import Q8 from './pages/quad/Q8'
import Q9 from './pages/quad/Q9'
import S1 from './pages/single/S1'
import S2 from './pages/single/S2'
import S3 from './pages/single/S3'
import S4 from './pages/single/S4'
import S5 from './pages/single/S5'
import S6 from './pages/single/S6'

const screens: Record<ScreenId, Component<{ app: AppStore }>> = {
  home: Home,
  managePrinters: ManagePrinters,
  q1: Q1,
  q2: Q2,
  q3: Q3,
  q4: Q4,
  q5: Q5,
  q6: Q6,
  q7: Q7,
  q8: Q8,
  q9: Q9,
  s1: S1,
  s2: S2,
  s3: S3,
  s4: S4,
  s5: S5,
  s6: S6,
}

function App() {
  const [screen, setScreen] = createSignal<ScreenId>('home')
  const [printers, setPrinters] = createSignal<Printer[]>([])
  const [prefs, setPrefs] = createSignal<Prefs>({
    skipPrerequisiteCheck: false,
  })
  const [measurements, setMeasurements] = createSignal<MeasurementState>(
    createEmptyMeasurements(),
  )
  const [selectedPrinter, setSelectedPrinter] = createSignal<Printer | null>(
    null,
  )
  const [storageUnavailable, setStorageUnavailable] = createSignal(false)
  const [printersCorrupt, setPrintersCorrupt] = createSignal(false)
  const [persistError, setPersistError] = createSignal(false)
  const [exitOpen, setExitOpen] = createSignal(false)

  // Screen history backs the in-flow Back action. PRD §9 / T12.
  const history: ScreenId[] = []

  onMount(() => {
    if (!isStorageAvailable()) setStorageUnavailable(true)
    const loaded = loadPrinters()
    setPrinters(loaded.printers)
    setPrintersCorrupt(loaded.error)
    setPrefs(loadPrefs())
  })

  const mutatePrinters = (list: Printer[]) => {
    setPrinters(list)
    setPersistError(!savePrinters(list))
  }

  const leaveFlow = () => {
    history.length = 0
    setMeasurements(createEmptyMeasurements())
    setScreen('home')
  }

  const store: AppStore = {
    screen,
    printers,
    prefs,
    measurements,
    selectedPrinter,
    storageUnavailable,
    printersCorrupt,
    persistError,
    exitOpen,

    go: (next) => {
      history.push(screen())
      setScreen(next)
    },
    back: () => {
      const previous = history.pop()
      if (previous) setScreen(previous)
    },
    requestExit: () => setExitOpen(true),
    cancelExit: () => setExitOpen(false),
    confirmExit: () => {
      setExitOpen(false)
      leaveFlow()
    },
    finishFlow: leaveFlow,

    resetMeasurements: () => setMeasurements(createEmptyMeasurements()),
    setMeasurement: (axis: Axis, key: MeasurementKey, value: number) =>
      setMeasurements((prev) => ({
        ...prev,
        [axis]: { ...prev[axis], [key]: value },
      })),

    selectPrinter: (printer) => setSelectedPrinter(printer),

    addPrinter: (printer) => mutatePrinters([...printers(), printer]),
    updatePrinter: (originalName, printer) =>
      mutatePrinters(
        printers().map((existing) =>
          existing.name === originalName ? printer : existing,
        ),
      ),
    deletePrinter: (name) =>
      mutatePrinters(printers().filter((existing) => existing.name !== name)),
    setPrintersFromImport: (list) => mutatePrinters(list),

    setSkipPrerequisiteCheck: (value) => {
      const next = { ...prefs(), skipPrerequisiteCheck: value }
      setPrefs(next)
      if (!savePrefs(next)) setPersistError(true)
    },
  }

  return (
    <main class="truss-shell">
      <Show when={storageUnavailable()}>
        <Notice variant="warning">
          Browser storage is unavailable — saved printers won't persist this
          session.
        </Notice>
      </Show>
      <Show when={printersCorrupt()}>
        <Notice variant="warning">
          Saved printers couldn't be read and are shown as empty. Use Import to
          restore them from a backup.
        </Notice>
      </Show>
      <Show when={persistError()}>
        <Notice variant="warning">
          Your changes couldn't be saved to this browser's storage.
        </Notice>
      </Show>

      <Dynamic component={screens[screen()]} app={store} />

      <Modal
        open={exitOpen()}
        title="Leave calibration?"
        onClose={() => store.cancelExit()}
      >
        <p>
          Your in-progress calibration will be lost. Are you sure you want to
          leave?
        </p>
        <div class="truss-modal-actions">
          <Button variant="secondary" onClick={() => store.cancelExit()}>
            Keep calibrating
          </Button>
          <Button onClick={() => store.confirmExit()}>Discard and leave</Button>
        </div>
      </Modal>
    </main>
  )
}

export default App
