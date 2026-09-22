import { type Component, createSignal } from 'solid-js'
import { NumberField } from '../../components/ui/Field'
import { FlowLayout } from '../../components/ui/FlowLayout'
import type { Axis, MeasurementKey, MeasurementState } from '../../lib/types'
import {
  MEASUREMENT_RANGE_WARNING,
  parseNumber,
  validateMeasurement,
} from '../../lib/validation'

export interface Q7Props {
  current: number
  total: number
  onBack: () => void
  onExit: () => void
  onContinue: () => void
  measurements: MeasurementState
  setMeasurements: (values: MeasurementState) => void
}

const AXIS_KEYS: {
  axis: Axis
  outer: MeasurementKey
  inner: MeasurementKey
}[] = [
  { axis: 'Y', outer: 'YOuter', inner: 'YInner' },
  { axis: 'A', outer: 'AOuter', inner: 'AInner' },
  { axis: 'B', outer: 'BOuter', inner: 'BInner' },
]

/** Q7 — measure the remaining Y, A and B axes on one screen (PRD §10, §14). */
export const Q7MeasureYab: Component<Q7Props> = (props) => {
  const initial = () => {
    const state: Partial<Record<MeasurementKey, string>> = {}
    for (const { outer, inner } of AXIS_KEYS) {
      state[outer] =
        props.measurements[outer] !== undefined
          ? String(props.measurements[outer])
          : ''
      state[inner] =
        props.measurements[inner] !== undefined
          ? String(props.measurements[inner])
          : ''
    }
    return state as Record<MeasurementKey, string>
  }
  const [values, setValues] = createSignal<Record<MeasurementKey, string>>(
    initial(),
  )

  const setField = (key: MeasurementKey, value: string) =>
    setValues({ ...values(), [key]: value })

  const allKeys = AXIS_KEYS.flatMap(({ outer, inner }) => [outer, inner])
  const valid = () =>
    allKeys.every((key) => validateMeasurement(values()[key]).valid)

  const warning = (key: MeasurementKey) =>
    validateMeasurement(values()[key]).warn
      ? MEASUREMENT_RANGE_WARNING
      : undefined

  const cont = () => {
    if (!valid()) return
    const result: MeasurementState = {}
    for (const key of allKeys) {
      const value = parseNumber(values()[key])
      if (value !== null) result[key] = value
    }
    props.setMeasurements(result)
    props.onContinue()
  }

  return (
    <FlowLayout
      current={props.current}
      total={props.total}
      onBack={props.onBack}
      onExit={props.onExit}
      onContinue={cont}
      continueDisabled={!valid()}
    >
      <h1 class="truss-page__title">Measure Y, A and B</h1>
      <p>
        Repeat the same inner and outer measurements for the remaining three
        axes. Note them down carefully, making sure not to mix up X, Y, A and B.
      </p>

      {AXIS_KEYS.map(({ axis, outer, inner }) => (
        <div class="truss-page__section">
          <h2>{axis} axis</h2>
          <div class="truss-measure-grid">
            <NumberField
              id={`truss-q7-${axis}-outer`}
              label={`${axis} — Outer`}
              unit="mm"
              value={values()[outer]}
              onInput={(value) => setField(outer, value)}
              warning={warning(outer)}
            />
            <NumberField
              id={`truss-q7-${axis}-inner`}
              label={`${axis} — Inner`}
              unit="mm"
              value={values()[inner]}
              onInput={(value) => setField(inner, value)}
              warning={warning(inner)}
            />
          </div>
        </div>
      ))}
    </FlowLayout>
  )
}
