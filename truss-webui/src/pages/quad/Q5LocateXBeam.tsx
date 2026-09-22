import type { Component } from 'solid-js'
import { FlowLayout } from '../../components/ui/FlowLayout'
import { ZoomImage } from '../../components/ui/ZoomImage'

export interface Q5Props {
  current: number
  total: number
  onBack: () => void
  onExit: () => void
  onContinue: () => void
}

/** Q5 — locate the X-beam (PRD §16). */
export const Q5LocateXBeam: Component<Q5Props> = (props) => (
  <FlowLayout
    current={props.current}
    total={props.total}
    onBack={props.onBack}
    onExit={props.onExit}
    onContinue={props.onContinue}
  >
    <h1 class="truss-page__title">Locate the X-beam</h1>
    <p>
      Locate the X-beam along the X axis — it is marked with an X label on the
      print. The letters were enlarged from the prototype stage; production
      prints should be much easier to read.
    </p>
    <ZoomImage name="xBeam" />
  </FlowLayout>
)
