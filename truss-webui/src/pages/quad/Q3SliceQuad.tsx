import type { Component } from 'solid-js'
import { FlowLayout } from '../../components/ui/FlowLayout'
import { ZoomImage } from '../../components/ui/ZoomImage'
import { stl } from '../../lib/assets'

export interface Q3Props {
  current: number
  total: number
  onBack: () => void
  onExit: () => void
  onContinue: () => void
}

/** Q3 — download and slice the Quad file (PRD §16). */
export const Q3SliceQuad: Component<Q3Props> = (props) => (
  <FlowLayout
    current={props.current}
    total={props.total}
    onBack={props.onBack}
    onExit={props.onExit}
    onContinue={props.onContinue}
  >
    <h1 class="truss-page__title">Slice the Quad file</h1>

    <p>
      Download the Quad STL and load it into a modern slicer. This guide covers
      OrcaSlicer / Bambu Studio; adjust as needed for others.
    </p>
    <p>
      <a
        class="truss-button"
        href={stl.quad}
        download="Truss Calibration Beam Quad.stl"
      >
        Download Quad STL
      </a>
    </p>
    <ZoomImage name="trussQuad" />

    <ol class="truss-page__steps">
      <li>
        Slice it with settings that print accurately and reliably — no warping,
        curling, or extreme dimensional inaccuracy from overspeed.
        <ZoomImage name="slicerLoaded" />
      </li>
      <li>
        In the preview, make sure seams are not placed on the measurement
        surfaces.
        <div class="truss-inline-images">
          <ZoomImage name="outerMeasurementWalls" />
          <ZoomImage name="innerMeasurementWalls" />
        </div>
        In Orca/Bambu you may need to enable seam visibility in the preview.
        <ZoomImage name="seamVisibility" />
        If the slicer generated seams on those surfaces, relocate them with the
        seam tool to elsewhere on the print.
        <div class="truss-inline-images">
          <ZoomImage name="seamTool" />
          <ZoomImage name="outerSeamExample" />
        </div>
      </li>
    </ol>
  </FlowLayout>
)
