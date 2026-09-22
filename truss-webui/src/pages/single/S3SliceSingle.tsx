import type { Component } from 'solid-js'
import { FlowLayout } from '../../components/ui/FlowLayout'
import { ZoomImage } from '../../components/ui/ZoomImage'
import { stl } from '../../lib/assets'

export interface S3Props {
  current: number
  total: number
  printerName: string
  onBack: () => void
  onExit: () => void
  onContinue: () => void
}

/** S3 — download and slice the Single file (PRD §16). */
export const S3SliceSingle: Component<S3Props> = (props) => (
  <FlowLayout
    current={props.current}
    total={props.total}
    printerName={props.printerName}
    onBack={props.onBack}
    onExit={props.onExit}
    onContinue={props.onContinue}
  >
    <h1 class="truss-page__title">Slice the Single file</h1>

    <p>
      Download the Single STL and load it into a modern slicer. Slice it as
      described in the Quad guide, making sure no seams exist on the measurement
      faces.
    </p>
    <p>
      <a
        class="truss-button"
        href={stl.single}
        download="Truss Calibration Beam Single.stl"
      >
        Download Single STL
      </a>
    </p>
    <div class="truss-inline-images">
      <ZoomImage name="trussSingle" />
      <ZoomImage name="slicedSingle" />
    </div>
  </FlowLayout>
)
