import { type Component, createSignal, For } from 'solid-js'
import { FlowLayout } from '../../components/ui/FlowLayout'
import type { Printer } from '../../lib/types'

export interface S1Props {
  current: number
  total: number
  onExit: () => void
  onContinue: (printer: Printer) => void
  printers: Printer[]
}

/** S1 — select the saved printer to calibrate (PRD §10). */
export const S1SelectPrinter: Component<S1Props> = (props) => {
  const [selected, setSelected] = createSignal<string | null>(null)

  const chosen = () =>
    props.printers.find((printer) => printer.name === selected()) ?? null

  return (
    <FlowLayout
      current={props.current}
      total={props.total}
      onExit={props.onExit}
      onContinue={() => {
        const printer = chosen()
        if (printer) props.onContinue(printer)
      }}
      continueDisabled={chosen() === null}
    >
      <h1 class="truss-page__title">Select your printer</h1>
      <p>
        Choose the printer you are calibrating. This supplies the extrapolation
        factor saved during its Quad calibration.
      </p>

      <div class="truss-page__section truss-printer-list">
        <For each={props.printers}>
          {(printer) => (
            <div class="truss-checkbox">
              <input
                id={`truss-s1-${printer.name}`}
                type="radio"
                name="truss-s1-printer"
                value={printer.name}
                checked={selected() === printer.name}
                onChange={() => setSelected(printer.name)}
              />
              <label for={`truss-s1-${printer.name}`}>{printer.name}</label>
            </div>
          )}
        </For>
      </div>
    </FlowLayout>
  )
}
