import { type Component, createMemo } from 'solid-js'
import { ResultScreen } from '../../components/ui/ResultScreen'
import { singleExtrapolatedRatio } from '../../lib/calc'
import type { MeasurementState, Printer } from '../../lib/types'

export interface S6Props {
  current: number
  total: number
  printer: Printer
  measurements: MeasurementState
  onFinish: () => void
}

/** S6 — extrapolated Single-beam ratio and final result (PRD §13.2, §13.3). */
export const S6Result: Component<S6Props> = (props) => {
  const ratio = createMemo(() =>
    singleExtrapolatedRatio(
      props.measurements.XInner ?? Number.NaN,
      props.measurements.XOuter ?? Number.NaN,
      props.printer.extrapolationFactor,
    ),
  )
  return (
    <ResultScreen
      current={props.current}
      total={props.total}
      printerName={props.printer.name}
      ratioLabel="extrapolated compensation ratio"
      ratio={ratio()}
      onFinish={props.onFinish}
    />
  )
}
