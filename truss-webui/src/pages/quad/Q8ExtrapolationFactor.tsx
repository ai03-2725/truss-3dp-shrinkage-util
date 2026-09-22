import { type Component, createMemo, createSignal } from 'solid-js'
import { TextField } from '../../components/ui/Field'
import { FlowLayout } from '../../components/ui/FlowLayout'
import { format5dp, quadExtrapolationFactor } from '../../lib/calc'
import type { MeasurementState, Printer } from '../../lib/types'
import { validatePrinterName } from '../../lib/validation'

export interface Q8Props {
  current: number
  total: number
  onBack: () => void
  onExit: () => void
  onSave: (printer: Printer) => void
  measurements: MeasurementState
  existingNames: string[]
}

/** Q8 — compute the extrapolation factor and save the printer (PRD §13.1). */
export const Q8ExtrapolationFactor: Component<Q8Props> = (props) => {
  const [name, setName] = createSignal('')
  const factor = createMemo(() => quadExtrapolationFactor(props.measurements))
  const validation = createMemo(() =>
    validatePrinterName(name(), props.existingNames),
  )
  const valid = () => validation().valid

  const save = () => {
    if (!valid()) return
    props.onSave({ name: name().trim(), extrapolationFactor: factor() })
  }

  return (
    <FlowLayout
      current={props.current}
      total={props.total}
      onBack={props.onBack}
      onExit={props.onExit}
      onContinue={save}
      continueLabel="Save & continue"
      continueDisabled={!valid()}
    >
      <h1 class="truss-page__title">Your extrapolation factor</h1>

      <p>
        This printer's extrapolation factor is the average of all eight
        measurements divided by the average of the two X measurements. It lets
        future Single-beam calibrations predict what a full Quad print would
        measure.
      </p>
      <div class="truss-result">
        <p class="truss-result__label">Extrapolation factor</p>
        <p class="truss-result__value">{format5dp(factor())}</p>
        <p class="truss-result__sentence">
          This is <strong>not</strong> the filament shrinkage value. Do not
          enter it into the slicer.
        </p>
      </div>
      <p>
        Name this printer so it can be selected for the rapid Single-beam
        calibration later.
      </p>

      <TextField
        id="truss-q8-printer-name"
        label="Printer name"
        value={name()}
        onInput={setName}
        error={name() !== '' ? validation().error : undefined}
        autofocus
      />
    </FlowLayout>
  )
}
