import { Match, Show, Switch } from 'solid-js'
import { createFlowEngine, type FlowEngine } from '../flow/engine'
import { appStorage } from '../storage/adapter'
import { createPrinterRepository, type PrinterRepository } from '../storage/printers'
import { createSettingsStore, type SettingsStore } from '../storage/settings'
import { LiveRegion } from './a11y'
import { Landing, PrinterData } from './screens'
import { StepScreen } from './steps'

/**
 * The collaborators the root needs, plus a seam for tests.
 *
 * This is not part of the element's contract — the element stays zero-config
 * (decision 14). The end-to-end tests need storage they can make fail, so the root
 * accepts a prepared graph instead of always building its own.
 */
export interface CalibratorDependencies {
  readonly engine: FlowEngine
  readonly printers: PrinterRepository
  readonly settings: SettingsStore
}

/**
 * The app root rendered into the custom element's shadow root.
 *
 * Owns the dependency graph — storage, the two stores, and the flow engine — for
 * the lifetime of one mounted widget. Building it here rather than in a module
 * singleton is what lets a host page mount, unmount, and remount the element and
 * get a clean app each time, which is what T12's teardown promises.
 *
 * The live regions are mounted once at the root and stay in the DOM for the app's
 * whole life: a region added to the DOM at the same moment it is filled is not
 * reliably announced.
 */
export function Calibrator(props: { readonly dependencies?: CalibratorDependencies } = {}) {
  /**
   * Assembled **once**, at mount.
   *
   * The app's state lives in the engine's signals, so this has to be a single
   * instance: a lazy getter that built a fresh engine on every read left the
   * shipped element inert (each navigation clicked its way into a new, empty
   * engine). It is deliberately a plain `const` rather than a memo — there is
   * nothing here to react to, and a memo would invite the same mistake back.
   */
  const dependencies: CalibratorDependencies =
    props.dependencies ??
    (() => {
      const storage = appStorage()
      const printers = createPrinterRepository(storage)
      const settings = createSettingsStore(storage)
      return { printers, settings, engine: createFlowEngine({ settings }) }
    })()

  return (
    <>
      <LiveRegion />
      <LiveRegion politeness="assertive" />

      <div class="truss-calibrator-root">
        <Switch>
          <Match when={dependencies.engine.screen() === 'landing'}>
            <Landing engine={dependencies.engine} />
          </Match>

          <Match when={dependencies.engine.screen() === 'printers'}>
            <PrinterData {...dependencies} />
          </Match>

          <Match when={dependencies.engine.screen() === 'flow'}>
            <Show when={dependencies.engine.step()}>
              {(step) => <StepScreen step={step()} {...dependencies} />}
            </Show>
          </Match>
        </Switch>
      </div>
    </>
  )
}

export default Calibrator
