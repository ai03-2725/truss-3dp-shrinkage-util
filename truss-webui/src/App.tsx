import { Match, Show, Switch, createEffect, createMemo, createSignal } from 'solid-js'
import type { AppApi, QuadAxis } from './lib/app-api.ts'
import type {
  ActiveCalibration,
  BeamInput,
  PrerequisiteState,
  Printer,
  QuadInput,
  SingleInput,
  TuningState,
} from './lib/types.ts'
import { emptyEquipment, emptyQuad, emptySingle, emptyTuning } from './lib/types.ts'
import { browserStorage, load, save } from './lib/storage.ts'
import { previousStep } from './lib/flow.ts'
import { upsertPrinter } from './lib/printers.ts'
import { ConfirmDialog } from './components/ConfirmDialog.tsx'
import { Home } from './pages/Home.tsx'
import { Printers } from './pages/Printers.tsx'
import { About } from './pages/About.tsx'
import {
  QuadEquipment,
  QuadFilament,
  QuadSlice,
  QuadPrint,
  QuadLocate,
  QuadX,
  QuadYab,
  QuadName,
  QuadResult,
} from './pages/quad.tsx'
import {
  SinglePrinter,
  SingleFilament,
  SingleSlice,
  SinglePrint,
  SingleMeasure,
  SingleResult,
} from './pages/single.tsx'

function App() {
  // Load synchronously so the first render already shows the resumed screen.
  const store = browserStorage()
  const initial = load(store)
  const [printers, setPrinters] = createSignal<Printer[]>(initial.state.printers)
  const [skipEquipment, setSkipEquipmentSignal] = createSignal(initial.state.skipEquipment)
  const [active, setActive] = createSignal<ActiveCalibration | null>(initial.state.active)
  const [view, setView] = createSignal<'home' | 'printers' | 'about'>('home')
  const [storageWarning, setStorageWarning] = createSignal<string | null>(initial.warning)
  const [exitConfirmOpen, setExitConfirmOpen] = createSignal(false)

  let firstSave = true
  createEffect(() => {
    const snapshot = {
      printers: printers(),
      skipEquipment: skipEquipment(),
      active: active(),
    }
    if (firstSave) {
      firstSave = false
      return
    }
    const warning = save(store, snapshot)
    if (warning) setStorageWarning(warning)
  })

  // Memoized so it only changes when the step changes, not on every state edit.
  const screen = createMemo(() => active()?.step ?? view())

  // Start each screen at the top; otherwise a long page's scroll position
  // carries over to the next step.
  createEffect(() => {
    screen()
    window.scrollTo(0, 0)
  })

  const setStep = (step: string) => setActive((current) => (current ? { ...current, step } : current))

  const mutateActive = (fn: (current: ActiveCalibration) => ActiveCalibration) =>
    setActive((current) => (current ? fn(current) : current))

  const newActive = (flow: 'quad' | 'single', step: string): ActiveCalibration => ({
    flow,
    step,
    selectedPrinterName: '',
    equipment: emptyEquipment(),
    tuning: emptyTuning(),
    quadSaveFailed: false,
    quad: emptyQuad(),
    single: emptySingle(),
  })

  const startQuad = () => {
    const a = newActive('quad', skipEquipment() ? 'quad-filament' : 'quad-equipment')
    setActive(a)
  }

  const startSingle = () => setActive(newActive('single', 'single-printer'))

  const finish = () => {
    setActive(null)
    setView('home')
  }

  const requestExit = () => setExitConfirmOpen(true)
  const confirmExit = () => {
    setExitConfirmOpen(false)
    finish()
  }

  const back = () => {
    const previous = previousStep(screen())
    if (previous) setStep(previous)
  }

  const saveQuadPrinter = (name: string, factor: number) => {
    const next = upsertPrinter(printers(), name, factor)
    setPrinters(next)
    // Persist explicitly so the result screen can tell whether the save actually landed.
    const warning = save(store, { printers: next, skipEquipment: skipEquipment(), active: active() })
    const failed = warning !== null
    if (warning) setStorageWarning(warning)
    mutateActive((current) => ({ ...current, step: 'quad-result', quadSaveFailed: failed }))
  }

  const api: AppApi = {
    printers,
    skipEquipment,
    storageWarning,
    active,
    screen,
    startQuad,
    startSingle,
    openPrinters: () => setView('printers'),
    openAbout: () => setView('about'),
    back,
    requestExit,
    finish,
    updateEquipment: (patch: Partial<PrerequisiteState>) =>
      mutateActive((current) => ({ ...current, equipment: { ...current.equipment, ...patch } })),
    updateTuning: (patch: Partial<TuningState>) =>
      mutateActive((current) => ({ ...current, tuning: { ...current.tuning, ...patch } })),
    updateQuad: (patch: Partial<QuadInput>) =>
      mutateActive((current) => ({ ...current, quad: { ...current.quad, ...patch } })),
    updateQuadBeam: (axis: QuadAxis, patch: Partial<BeamInput>) =>
      mutateActive((current) => ({
        ...current,
        quad: { ...current.quad, [axis]: { ...current.quad[axis], ...patch } },
      })),
    updateSingle: (patch: Partial<SingleInput>) =>
      mutateActive((current) => ({ ...current, single: { ...current.single, ...patch } })),
    updateSingleBeam: (patch: Partial<BeamInput>) =>
      mutateActive((current) => ({ ...current, single: { ...current.single, ...patch } })),
    selectPrinter: (name: string) => mutateActive((current) => ({ ...current, selectedPrinterName: name })),
    setStep,
    setSkipEquipment: setSkipEquipmentSignal,
    replacePrinters: setPrinters,
    saveQuadPrinter,
  }

  return (
    <>
      <Show when={storageWarning()}>
        {(message) => (
          <div class="truss-storage-warning" role="alert">
            {message()}
          </div>
        )}
      </Show>

      <Switch>
        <Match when={screen() === 'home'}>
          <Home app={api} />
        </Match>
        <Match when={screen() === 'printers'}>
          <Printers app={api} />
        </Match>
        <Match when={screen() === 'about'}>
          <About app={api} />
        </Match>
        <Match when={screen() === 'quad-equipment'}>
          <QuadEquipment app={api} />
        </Match>
        <Match when={screen() === 'quad-filament'}>
          <QuadFilament app={api} />
        </Match>
        <Match when={screen() === 'quad-slice'}>
          <QuadSlice app={api} />
        </Match>
        <Match when={screen() === 'quad-print'}>
          <QuadPrint app={api} />
        </Match>
        <Match when={screen() === 'quad-locate'}>
          <QuadLocate app={api} />
        </Match>
        <Match when={screen() === 'quad-x'}>
          <QuadX app={api} />
        </Match>
        <Match when={screen() === 'quad-yab'}>
          <QuadYab app={api} />
        </Match>
        <Match when={screen() === 'quad-name'}>
          <QuadName app={api} />
        </Match>
        <Match when={screen() === 'quad-result'}>
          <QuadResult app={api} />
        </Match>
        <Match when={screen() === 'single-printer'}>
          <SinglePrinter app={api} />
        </Match>
        <Match when={screen() === 'single-filament'}>
          <SingleFilament app={api} />
        </Match>
        <Match when={screen() === 'single-slice'}>
          <SingleSlice app={api} />
        </Match>
        <Match when={screen() === 'single-print'}>
          <SinglePrint app={api} />
        </Match>
        <Match when={screen() === 'single-measure'}>
          <SingleMeasure app={api} />
        </Match>
        <Match when={screen() === 'single-result'}>
          <SingleResult app={api} />
        </Match>
      </Switch>

      <Show when={exitConfirmOpen()}>
        <ConfirmDialog
          title="Exit calibration?"
          message="Leaving now clears this calibration's measurements, checkboxes, and progress. Saved printer profiles are kept."
          confirmLabel="Exit and clear progress"
          onConfirm={confirmExit}
          onCancel={() => setExitConfirmOpen(false)}
        />
      </Show>
    </>
  )
}

export default App
