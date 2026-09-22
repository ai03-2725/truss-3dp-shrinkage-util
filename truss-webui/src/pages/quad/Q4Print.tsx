import type { Component } from 'solid-js'
import { FlowLayout } from '../../components/ui/FlowLayout'
import { ZoomImage } from '../../components/ui/ZoomImage'

export interface Q4Props {
  current: number
  total: number
  onBack: () => void
  onExit: () => void
  onContinue: () => void
}

/** Q4 — printing and plate removal guidance (PRD §16). */
export const Q4Print: Component<Q4Props> = (props) => (
  <FlowLayout
    current={props.current}
    total={props.total}
    onBack={props.onBack}
    onExit={props.onExit}
    onContinue={props.onContinue}
  >
    <h1 class="truss-page__title">Print the beam</h1>

    <ol class="truss-page__steps">
      <li>
        Print the file.
        <ZoomImage name="printingQuad" />
      </li>
      <li>
        Once printed,{' '}
        <strong>do not force the print off the build plate</strong>— this may
        warp the print and render measurements meaningless. Wait for the print
        to fully cool, then remove it; do not measure it while it is attached to
        the build plate.
        <ZoomImage name="finishedPrint" />
      </li>
    </ol>
  </FlowLayout>
)
