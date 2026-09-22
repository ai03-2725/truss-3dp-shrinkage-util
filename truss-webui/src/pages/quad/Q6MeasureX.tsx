import { type Component, createSignal } from 'solid-js'
import { NumberField } from '../../components/ui/Field'
import { FlowLayout } from '../../components/ui/FlowLayout'
import { ZoomImage } from '../../components/ui/ZoomImage'
import type { MeasurementState } from '../../lib/types'
import {
  MEASUREMENT_RANGE_WARNING,
  parseNumber,
  validateMeasurement,
} from '../../lib/validation'

export interface Q6Props {
  current: number
  total: number
  onBack: () => void
  onExit: () => void
  onContinue: () => void
  measurements: MeasurementState
  setMeasurements: (values: MeasurementState) => void
}

/** Q6 — measure the X-beam inner and outer dimensions (PRD §13, §14). */
export const Q6MeasureX: Component<Q6Props> = (props) => {
  const [outer, setOuter] = createSignal(
    props.measurements.XOuter !== undefined
      ? String(props.measurements.XOuter)
      : '',
  )
  const [inner, setInner] = createSignal(
    props.measurements.XInner !== undefined
      ? String(props.measurements.XInner)
      : '',
  )

  const outerValidation = () => validateMeasurement(outer())
  const innerValidation = () => validateMeasurement(inner())
  const valid = () => outerValidation().valid && innerValidation().valid

  const warning = (raw: string) =>
    validateMeasurement(raw).warn ? MEASUREMENT_RANGE_WARNING : undefined

  const cont = () => {
    if (!valid()) return
    const outerValue = parseNumber(outer())
    const innerValue = parseNumber(inner())
    if (outerValue === null || innerValue === null) return
    props.setMeasurements({ XOuter: outerValue, XInner: innerValue })
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
      <h1 class="truss-page__title">Measure the X-beam</h1>

      <div class="truss-page__section">
        <p>
          <strong>
            Do not apply excess force to the print with your calipers.
          </strong>{' '}
          3D printed plastics are elastic, and excess force will deform the
          print and yield dimensions larger or smaller than actually printed.
          Ideally the calipers should exert no force at all. If your calipers
          have thumb-wheel rollers, do not use them to exert excess force.
        </p>
        <p>
          Measure with the calipers parallel to the dimension you are measuring
          — excessively angled calipers will fail to measure correctly.
        </p>
      </div>

      <div class="truss-inline-images">
        <ZoomImage name="xOuterDiagram" />
        <ZoomImage name="xOuterMeasurement" />
        <ZoomImage name="xInnerDiagram" />
        <ZoomImage name="xInnerMeasurement" />
      </div>

      <div class="truss-page__section">
        <p>
          <strong>Warning:</strong> the file guides your calipers' inner teeth
          only when oriented correctly. Measuring incorrectly will yield
          incorrect, meaningless values.
        </p>
        <div class="truss-inline-images">
          <ZoomImage name="caliperEnterTop" />
          <ZoomImage name="innerCorrect1" />
          <ZoomImage name="innerCorrect2" />
          <ZoomImage name="calipersIncorrectGap" />
          <ZoomImage name="calipersIncorrectSide" />
        </div>
      </div>

      <p>Enter the two X measurements below.</p>
      <NumberField
        id="truss-q6-x-outer"
        label="X — Outer"
        unit="mm"
        value={outer()}
        onInput={setOuter}
        warning={warning(outer())}
      />
      <NumberField
        id="truss-q6-x-inner"
        label="X — Inner"
        unit="mm"
        value={inner()}
        onInput={setInner}
        warning={warning(inner())}
      />
    </FlowLayout>
  )
}
