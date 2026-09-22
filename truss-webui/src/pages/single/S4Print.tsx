import type { Component } from 'solid-js'
import { FlowLayout } from '../../components/ui/FlowLayout'
import { ZoomImage } from '../../components/ui/ZoomImage'

export interface S4Props {
  current: number
  total: number
  printerName: string
  onBack: () => void
  onExit: () => void
  onContinue: () => void
}

/** S4 — printing and plate removal guidance (PRD §16). */
export const S4Print: Component<S4Props> = (props) => (
  <FlowLayout
    current={props.current}
    total={props.total}
    printerName={props.printerName}
    onBack={props.onBack}
    onExit={props.onExit}
    onContinue={props.onContinue}
  >
    <h1 class="truss-page__title">Print the beam</h1>

    <ol class="truss-page__steps">
      <li>
        Print the file.
        <ZoomImage name="printingSingle" />
      </li>
      <li>
        Once printed,{' '}
        <strong>do not force the print off the build plate</strong>— this may
        warp the print and render measurements meaningless. Wait for the print
        to fully cool, then remove it; do not measure it while it is attached to
        the build plate.
      </li>
    </ol>
  </FlowLayout>
)
