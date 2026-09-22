import { type Component, createMemo } from 'solid-js'
import { ResultScreen } from '../../components/ui/ResultScreen'
import { quadCompensationRatio } from '../../lib/calc'
import type { MeasurementState } from '../../lib/types'

export interface Q9Props {
  current: number
  total: number
  printerName: string
  measurements: MeasurementState
  onFinish: () => void
}

/** Q9 — Quad compensation ratio and final result (PRD §13.2). */
export const Q9Result: Component<Q9Props> = (props) => {
  const ratio = createMemo(() => quadCompensationRatio(props.measurements))
  return (
    <ResultScreen
      current={props.current}
      total={props.total}
      printerName={props.printerName}
      ratioLabel="compensation ratio"
      ratio={ratio()}
      onFinish={props.onFinish}
    />
  )
}
