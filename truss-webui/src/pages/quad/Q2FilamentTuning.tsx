import { type Component, createSignal } from 'solid-js'
import { Checkbox } from '../../components/ui/Checkbox'
import { FlowLayout } from '../../components/ui/FlowLayout'

export interface Q2Props {
  current: number
  total: number
  onBack: () => void
  onExit: () => void
  onContinue: () => void
}

/** Q2 — prerequisite filament tuning (PRD §10). */
export const Q2FilamentTuning: Component<Q2Props> = (props) => {
  const [temperature, setTemperature] = createSignal(false)
  const [pressure, setPressure] = createSignal(false)
  const [flow, setFlow] = createSignal(false)

  const allChecked = () => temperature() && pressure() && flow()

  return (
    <FlowLayout
      current={props.current}
      total={props.total}
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
          id="truss-q2-temperature"
          checked={temperature()}
          onChange={setTemperature}
          label="Temperature settings: the manufacturer's recommendations are usually enough; print a temperature tower if you need to verify layer adhesion."
        />
        <Checkbox
          id="truss-q2-pressure"
          checked={pressure()}
          onChange={setPressure}
          label="Pressure Advance / Flow Dynamics: calibrated with your slicer's utility and applied to the printer."
        />
        <Checkbox
          id="truss-q2-flow"
          checked={flow()}
          onChange={setFlow}
          label="Flow rate: calibrated with your slicer's utility. If using Bambu Studio, keep the higher value when torn between two chips."
        />
      </div>
    </FlowLayout>
  )
}
