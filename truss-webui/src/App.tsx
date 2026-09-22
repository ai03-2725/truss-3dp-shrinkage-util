import {
  createMemo,
  createSignal,
  Match,
  onMount,
  Show,
  Switch,
} from 'solid-js'
import { Button } from './components/ui/Button'
import { Modal } from './components/ui/Modal'
import { Notice } from './components/ui/Notice'
import { stepsFor } from './lib/flow'
import {
  isStorageAvailable,
  loadPrefs,
  loadPrinters,
  savePrefs,
  savePrinters,
} from './lib/storage'
import type { MeasurementState, Prefs, Printer, ScreenId } from './lib/types'
import { Home } from './pages/Home'
import { ManagePrinters } from './pages/ManagePrinters'
import { Q1Prerequisites } from './pages/quad/Q1Prerequisites'
import { Q2FilamentTuning } from './pages/quad/Q2FilamentTuning'
import { Q3SliceQuad } from './pages/quad/Q3SliceQuad'
import { Q4Print } from './pages/quad/Q4Print'
import { Q5LocateXBeam } from './pages/quad/Q5LocateXBeam'
import { Q6MeasureX } from './pages/quad/Q6MeasureX'
import { Q7MeasureYab } from './pages/quad/Q7MeasureYab'
import { Q8ExtrapolationFactor } from './pages/quad/Q8ExtrapolationFactor'
import { Q9Result } from './pages/quad/Q9Result'
import { S1SelectPrinter } from './pages/single/S1SelectPrinter'
import { S2FilamentTuning } from './pages/single/S2FilamentTuning'
import { S3SliceSingle } from './pages/single/S3SliceSingle'
import { S4Print } from './pages/single/S4Print'
import { S5MeasureBeam } from './pages/single/S5MeasureBeam'
import { S6Result } from './pages/single/S6Result'

/**
 * Root component and single source of durable state (PRD §8, §9). Owns the
 * current screen, in-progress measurements, saved printers and preferences.
 */
function App() {
  const [screen, setScreen] = createSignal<ScreenId>('Home')
  const [measurements, setMeasurementsSignal] = createSignal<MeasurementState>(
    {},
  )
  const [printers, setPrintersSignal] = createSignal<Printer[]>([])
  const [prefs, setPrefs] = createSignal<Prefs>({
    skipPrerequisiteCheck: false,
  })
  const [selectedPrinter, setSelectedPrinter] = createSignal<Printer | null>(
    null,
  )
  const [lastSavedPrinter, setLastSavedPrinter] = createSignal<Printer | null>(
    null,
  )
  const [notice, setNotice] = createSignal<string | null>(null)
  const [exitOpen, setExitOpen] = createSignal(false)

  onMount(() => {
    if (!isStorageAvailable()) {
      setNotice(
        "Saved printers can't be stored in this browser, so changes will only last for this session.",
      )
    }
    const loaded = loadPrinters()
    setPrintersSignal(loaded.printers)
    setPrefs(loadPrefs())
    if (loaded.error) {
      setNotice(
        "Saved printers couldn't be read. The stored data has been left untouched.",
      )
    }
  })

  // ── Persistence ──────────────────────────────────────────────────────────
  const commitPrinters = (next: Printer[]) => {
    setPrintersSignal(next)
    if (!savePrinters(next)) {
      setNotice(
        "Changes couldn't be saved to this browser, so they will be lost on reload.",
      )
    }
  }

  const addPrinter = (printer: Printer) =>
    commitPrinters([...printers(), printer])
  const updatePrinter = (originalName: string, printer: Printer) =>
    commitPrinters(
      printers().map((existing) =>
        existing.name === originalName ? printer : existing,
      ),
    )
  const deletePrinter = (name: string) =>
    commitPrinters(printers().filter((printer) => printer.name !== name))

  // ── Navigation (PRD §9) ─────────────────────────────────────────────────
  const flowSteps = createMemo(() =>
    stepsFor(screen(), prefs().skipPrerequisiteCheck),
  )
  const currentIndex = createMemo(() => flowSteps()?.indexOf(screen()) ?? -1)
  const current = () => currentIndex() + 1
  const total = () => flowSteps()?.length ?? 0

  const resetMeasurements = () => setMeasurementsSignal({})
  const setMeasurements = (values: MeasurementState) =>
    setMeasurementsSignal({ ...measurements(), ...values })

  const goNext = () => {
    const steps = flowSteps()
    const index = currentIndex()
    if (steps && index >= 0 && index < steps.length - 1) {
      setScreen(steps[index + 1])
    }
  }
  const goBack = () => {
    const steps = flowSteps()
    const index = currentIndex()
    if (steps && index > 0) setScreen(steps[index - 1])
  }
  const requestExit = () => setExitOpen(true)
  const confirmExit = () => {
    setExitOpen(false)
    resetMeasurements()
    setSelectedPrinter(null)
    setScreen('Home')
  }

  const startQuad = () => {
    resetMeasurements()
    setSelectedPrinter(null)
    setLastSavedPrinter(null)
    setScreen(prefs().skipPrerequisiteCheck ? 'Q2' : 'Q1')
  }
  const startSingle = () => {
    resetMeasurements()
    setSelectedPrinter(null)
    setScreen('S1')
  }

  const handleQ1Continue = (dontAskAgain: boolean) => {
    const nextPrefs = { skipPrerequisiteCheck: dontAskAgain }
    setPrefs(nextPrefs)
    if (!savePrefs(nextPrefs)) {
      setNotice(
        "Changes couldn't be saved to this browser, so they will be lost on reload.",
      )
    }
    setScreen('Q2')
  }

  const handleQ8Save = (printer: Printer) => {
    setLastSavedPrinter(printer)
    addPrinter(printer)
    goNext()
  }

  const finish = () => {
    resetMeasurements()
    setSelectedPrinter(null)
    setScreen('Home')
  }

  return (
    <div class="truss-shell">
      <Show when={notice()}>
        <Notice kind="warning">{notice()}</Notice>
      </Show>

      <Switch>
        <Match when={screen() === 'Home'}>
          <Home
            printerCount={printers().length}
            onStartQuad={startQuad}
            onStartSingle={startSingle}
            onManagePrinters={() => setScreen('ManagePrinters')}
          />
        </Match>
        <Match when={screen() === 'ManagePrinters'}>
          <ManagePrinters
            printers={printers()}
            onAdd={addPrinter}
            onUpdate={updatePrinter}
            onDelete={deletePrinter}
            onSetPrinters={commitPrinters}
            onBack={() => setScreen('Home')}
          />
        </Match>

        <Match when={screen() === 'Q1'}>
          <Q1Prerequisites
            current={current()}
            total={total()}
            onExit={requestExit}
            onContinue={handleQ1Continue}
          />
        </Match>
        <Match when={screen() === 'Q2'}>
          <Q2FilamentTuning
            current={current()}
            total={total()}
            onBack={goBack}
            onExit={requestExit}
            onContinue={goNext}
          />
        </Match>
        <Match when={screen() === 'Q3'}>
          <Q3SliceQuad
            current={current()}
            total={total()}
            onBack={goBack}
            onExit={requestExit}
            onContinue={goNext}
          />
        </Match>
        <Match when={screen() === 'Q4'}>
          <Q4Print
            current={current()}
            total={total()}
            onBack={goBack}
            onExit={requestExit}
            onContinue={goNext}
          />
        </Match>
        <Match when={screen() === 'Q5'}>
          <Q5LocateXBeam
            current={current()}
            total={total()}
            onBack={goBack}
            onExit={requestExit}
            onContinue={goNext}
          />
        </Match>
        <Match when={screen() === 'Q6'}>
          <Q6MeasureX
            current={current()}
            total={total()}
            onBack={goBack}
            onExit={requestExit}
            onContinue={goNext}
            measurements={measurements()}
            setMeasurements={setMeasurements}
          />
        </Match>
        <Match when={screen() === 'Q7'}>
          <Q7MeasureYab
            current={current()}
            total={total()}
            onBack={goBack}
            onExit={requestExit}
            onContinue={goNext}
            measurements={measurements()}
            setMeasurements={setMeasurements}
          />
        </Match>
        <Match when={screen() === 'Q8'}>
          <Q8ExtrapolationFactor
            current={current()}
            total={total()}
            onBack={goBack}
            onExit={requestExit}
            onSave={handleQ8Save}
            measurements={measurements()}
            existingNames={printers().map((printer) => printer.name)}
          />
        </Match>
        <Match when={screen() === 'Q9'}>
          <Q9Result
            current={current()}
            total={total()}
            printerName={lastSavedPrinter()?.name ?? ''}
            measurements={measurements()}
            onFinish={finish}
          />
        </Match>

        <Match when={screen() === 'S1'}>
          <S1SelectPrinter
            current={current()}
            total={total()}
            onExit={requestExit}
            onContinue={(printer) => {
              setSelectedPrinter(printer)
              goNext()
            }}
            printers={printers()}
          />
        </Match>
        <Match when={screen() === 'S2'}>
          <S2FilamentTuning
            current={current()}
            total={total()}
            printerName={selectedPrinter()?.name ?? ''}
            onBack={goBack}
            onExit={requestExit}
            onContinue={goNext}
          />
        </Match>
        <Match when={screen() === 'S3'}>
          <S3SliceSingle
            current={current()}
            total={total()}
            printerName={selectedPrinter()?.name ?? ''}
            onBack={goBack}
            onExit={requestExit}
            onContinue={goNext}
          />
        </Match>
        <Match when={screen() === 'S4'}>
          <S4Print
            current={current()}
            total={total()}
            printerName={selectedPrinter()?.name ?? ''}
            onBack={goBack}
            onExit={requestExit}
            onContinue={goNext}
          />
        </Match>
        <Match when={screen() === 'S5'}>
          <S5MeasureBeam
            current={current()}
            total={total()}
            printerName={selectedPrinter()?.name ?? ''}
            onBack={goBack}
            onExit={requestExit}
            onContinue={goNext}
            measurements={measurements()}
            setMeasurements={setMeasurements}
          />
        </Match>
        <Match when={screen() === 'S6'}>
          <S6Result
            current={current()}
            total={total()}
            printer={selectedPrinter() ?? { name: '', extrapolationFactor: 1 }}
            measurements={measurements()}
            onFinish={finish}
          />
        </Match>
      </Switch>

      <Modal
        open={exitOpen()}
        title="Leave calibration?"
        onClose={() => setExitOpen(false)}
      >
        <p>Your progress in this calibration will be lost.</p>
        <div class="truss-modal__actions">
          <Button variant="secondary" onClick={() => setExitOpen(false)}>
            Keep calibrating
          </Button>
          <Button variant="danger" onClick={confirmExit}>
            Leave
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default App
