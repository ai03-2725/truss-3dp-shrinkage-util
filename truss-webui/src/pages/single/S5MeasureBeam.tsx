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

export interface S5Props {
  current: number
  total: number
  printerName: string
  onBack: () => void
  onExit: () => void
  onContinue: () => void
  measurements: MeasurementState
  setMeasurements: (values: MeasurementState) => void
}

/** S5 — measure the Single beam (PRD §13.3, §14). */
export const S5MeasureBeam: Component<S5Props> = (props) => {
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

  const valid = () =>
    validateMeasurement(outer()).valid && validateMeasurement(inner()).valid
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
      printerName={props.printerName}
      onBack={props.onBack}
      onExit={props.onExit}
      onContinue={cont}
      continueDisabled={!valid()}
    >
      <h1 class="truss-page__title">Measure the beam</h1>

      <p>
        <strong>
          Do not apply excess force to the print with your calipers.
        </strong>{' '}
        3D printed plastics are elastic, and excess force will deform the print
        and yield dimensions larger or smaller than actually printed. Measure
        with the calipers parallel to the dimension you are measuring.
      </p>
      <div class="truss-inline-images">
        <ZoomImage name="outerMeasurementSingle" />
        <ZoomImage name="singleMeasurementOuter" />
        <ZoomImage name="innerMeasurementSingle" />
        <ZoomImage name="singleMeasurementInner" />
      </div>

      <p>
        <strong>Warning:</strong> the file guides your calipers' inner teeth
        only when oriented correctly. Measuring incorrectly will yield
        incorrect, meaningless values. The photos below are for the Quad design
        but apply to all variants equally.
      </p>
      <div class="truss-inline-images">
        <ZoomImage name="caliperEnterTop" />
        <ZoomImage name="innerCorrect1" />
        <ZoomImage name="innerCorrect2" />
        <ZoomImage name="calipersIncorrectGap" />
        <ZoomImage name="calipersIncorrectSide" />
      </div>

      <p>Enter the two measurements below.</p>
      <NumberField
        id="truss-s5-outer"
        label="Outer"
        unit="mm"
        value={outer()}
        onInput={setOuter}
        warning={warning(outer())}
      />
      <NumberField
        id="truss-s5-inner"
        label="Inner"
        unit="mm"
        value={inner()}
        onInput={setInner}
        warning={warning(inner())}
      />
    </FlowLayout>
  )
}
