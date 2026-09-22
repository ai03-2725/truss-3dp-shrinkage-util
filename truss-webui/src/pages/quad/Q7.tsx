import { createSignal } from 'solid-js'
import FlowLayout from '../../components/FlowLayout'
import { TextField } from '../../components/ui'
import type { AppStore } from '../../lib/appState'
import { quadScreens } from '../../lib/flows'
import { MEASUREMENT_WARNING, validateMeasurement } from '../../lib/validation'

export default function Q7(props: { app: AppStore }) {
  const m = props.app.measurements()
  const [yOuter, setYOuter] = createSignal(m.Y.outer?.toString() ?? '')
  const [yInner, setYInner] = createSignal(m.Y.inner?.toString() ?? '')
  const [aOuter, setAOuter] = createSignal(m.A.outer?.toString() ?? '')
  const [aInner, setAInner] = createSignal(m.A.inner?.toString() ?? '')
  const [bOuter, setBOuter] = createSignal(m.B.outer?.toString() ?? '')
  const [bInner, setBInner] = createSignal(m.B.inner?.toString() ?? '')

  const fields = [
    {
      axis: 'Y' as const,
      outer: [yOuter, setYOuter] as const,
      inner: [yInner, setYInner] as const,
    },
    {
      axis: 'A' as const,
      outer: [aOuter, setAOuter] as const,
      inner: [aInner, setAInner] as const,
    },
    {
      axis: 'B' as const,
      outer: [bOuter, setBOuter] as const,
      inner: [bInner, setBInner] as const,
    },
  ]

  const warningFor = (raw: string) => {
    const result = validateMeasurement(raw)
    return result.valid && result.warn ? MEASUREMENT_WARNING : undefined
  }

  const valid = () =>
    fields.every(
      (field) =>
        validateMeasurement(field.outer[0]()).valid &&
        validateMeasurement(field.inner[0]()).valid,
    )

  const proceed = () => {
    for (const field of fields) {
      props.app.setMeasurement(field.axis, 'outer', Number(field.outer[0]()))
      props.app.setMeasurement(field.axis, 'inner', Number(field.inner[0]()))
    }
    props.app.go('q8')
  }

  return (
    <FlowLayout
      app={props.app}
      screens={quadScreens(props.app.prefs().skipPrerequisiteCheck)}
      screen="q7"
      title="Measure Y, A and B"
      onBack={() => props.app.back()}
      onContinue={proceed}
      continueDisabled={!valid()}
    >
      <p>
        Repeat the two inner/outer measurements for the remaining three axes (Y,
        A and B). Enter each value carefully, making sure not to mix up the
        axes.
      </p>

      {fields.map((field) => (
        <div class="truss-group">
          <h2 class="truss-group-title">{field.axis}-beam</h2>
          <TextField
            id={`q7-${field.axis}-outer`}
            label={`${field.axis} - Outer`}
            type="number"
            inputmode="decimal"
            suffix="mm"
            value={field.outer[0]()}
            onInput={field.outer[1]}
            warning={warningFor(field.outer[0]())}
          />
          <TextField
            id={`q7-${field.axis}-inner`}
            label={`${field.axis} - Inner`}
            type="number"
            inputmode="decimal"
            suffix="mm"
            value={field.inner[0]()}
            onInput={field.inner[1]}
            warning={warningFor(field.inner[0]())}
          />
        </div>
      ))}
    </FlowLayout>
  )
}
