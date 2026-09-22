import { createSignal } from 'solid-js'
import FlowLayout from '../../components/FlowLayout'
import { Checkbox } from '../../components/ui'
import type { AppStore } from '../../lib/appState'
import { SINGLE_STEPS } from '../../lib/flows'

export default function S2(props: { app: AppStore }) {
  const [temperature, setTemperature] = createSignal(false)
  const [pressureAdvance, setPressureAdvance] = createSignal(false)
  const [flowRate, setFlowRate] = createSignal(false)

  const allChecked = () => temperature() && pressureAdvance() && flowRate()

  return (
    <FlowLayout
      app={props.app}
      screens={SINGLE_STEPS}
      screen="s2"
      title="Tune the filament first"
      printerName={props.app.selectedPrinter()?.name}
      onBack={() => props.app.back()}
      onContinue={() => props.app.go('s3')}
      continueDisabled={!allChecked()}
    >
      <p>Make sure your filament has undergone prerequisite calibration:</p>

      <Checkbox
        id="s2-temperature"
        checked={temperature()}
        onChange={setTemperature}
        label={
          <>
            <strong>Temperature settings.</strong> The manufacturer's
            recommendation is usually enough. If printing a temperature tower,
            break it to judge layer adhesion.
          </>
        }
      />
      <Checkbox
        id="s2-pressure"
        checked={pressureAdvance()}
        onChange={setPressureAdvance}
        label={
          <>
            <strong>Pressure Advance / Flow Dynamics.</strong> Use your slicer's
            built-in calibration, and make sure the chosen value is actually
            applied to the printer.
          </>
        }
      />
      <Checkbox
        id="s2-flow"
        checked={flowRate()}
        onChange={setFlowRate}
        label={
          <>
            <strong>Flow rate.</strong> Use your slicer's built-in calibration.
            If using Bambu Studio and torn between two chips on the first pass,
            select the higher value.
          </>
        }
      />
    </FlowLayout>
  )
}
