import { type Component, createSignal } from 'solid-js'
import { Checkbox } from '../../components/ui/Checkbox'
import { FlowLayout } from '../../components/ui/FlowLayout'

export interface S2Props {
  current: number
  total: number
  printerName: string
  onBack: () => void
  onExit: () => void
  onContinue: () => void
}

/** S2 — prerequisite filament tuning (duplicated from Q2 per PRD §8). */
export const S2FilamentTuning: Component<S2Props> = (props) => {
  const [temperature, setTemperature] = createSignal(false)
  const [pressure, setPressure] = createSignal(false)
  const [flow, setFlow] = createSignal(false)

  const allChecked = () => temperature() && pressure() && flow()

  return (
    <FlowLayout
      current={props.current}
      total={props.total}
      printerName={props.printerName}
      onBack={props.onBack}
      onExit={props.onExit}
      onContinue={props.onContinue}
      continueDisabled={!allChecked()}
    >
      <h1 class="truss-page__title">Filament tuning</h1>
      <p>
        Make sure this filament has completed its prerequisite calibration
        before measuring shrinkage.
      </p>

      <div class="truss-page__section">
        <Checkbox
          id="truss-s2-temperature"
          checked={temperature()}
          onChange={setTemperature}
          label="Temperature settings: the manufacturer's recommendations are usually enough; print a temperature tower if you need to verify layer adhesion."
        />
        <Checkbox
          id="truss-s2-pressure"
          checked={pressure()}
          onChange={setPressure}
          label="Pressure Advance / Flow Dynamics: calibrated with your slicer's utility and applied to the printer."
        />
        <Checkbox
          id="truss-s2-flow"
          checked={flow()}
          onChange={setFlow}
          label="Flow rate: calibrated with your slicer's utility. If using Bambu Studio, keep the higher value when torn between two chips."
        />
      </div>
    </FlowLayout>
  )
}
