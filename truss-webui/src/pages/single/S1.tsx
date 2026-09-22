import { createSignal, For, Show } from 'solid-js'
import FlowLayout from '../../components/FlowLayout'
import type { AppStore } from '../../lib/appState'
import { SINGLE_STEPS } from '../../lib/flows'
import type { Printer } from '../../lib/types'

export default function S1(props: { app: AppStore }) {
  const [selectedName, setSelectedName] = createSignal(
    props.app.selectedPrinter()?.name ?? '',
  )

  const sorted = () =>
    [...props.app.printers()].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
    )

  const selected = () =>
    props.app.printers().find((printer) => printer.name === selectedName()) ??
    null

  const proceed = () => {
    const printer = selected()
    if (!printer) return
    props.app.selectPrinter(printer)
    props.app.go('s2')
  }

  return (
    <FlowLayout
      app={props.app}
      screens={SINGLE_STEPS}
      screen="s1"
      title="Select your printer"
      onContinue={proceed}
      continueDisabled={selected() === null}
    >
      <p>
        Choose the printer you are calibrating. These are the printers saved
        during a Quad-Beam calibration or imported from a backup.
      </p>

      <Show
        when={sorted().length > 0}
        fallback={
          <p class="truss-warning">
            No saved printers available. Run a quad-beam calibration first or
            import printers manually.
          </p>
        }
      >
        <div
          class="truss-radio-list"
          role="radiogroup"
          aria-label="Saved printers"
        >
          <For each={sorted()}>
            {(printer: Printer) => (
              <label
                class="truss-radio"
                classList={{
                  'truss-radio-selected': selectedName() === printer.name,
                }}
              >
                <input
                  type="radio"
                  name="truss-printer"
                  value={printer.name}
                  checked={selectedName() === printer.name}
                  onChange={() => setSelectedName(printer.name)}
                />
                <span>{printer.name}</span>
              </label>
            )}
          </For>
        </div>
      </Show>
    </FlowLayout>
  )
}
