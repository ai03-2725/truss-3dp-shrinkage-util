import FlowLayout from '../../components/FlowLayout'
import { ImageGrid } from '../../components/ui'
import type { AppStore } from '../../lib/appState'
import { altText, images, stl } from '../../lib/assets'
import { quadScreens } from '../../lib/flows'

export default function Q3(props: { app: AppStore }) {
  return (
    <FlowLayout
      app={props.app}
      screens={quadScreens(props.app.prefs().skipPrerequisiteCheck)}
      screen="q3"
      title="Slice the Quad file"
      onBack={() => props.app.back()}
      onContinue={() => props.app.go('q4')}
    >
      <a
        class="truss-download"
        href={stl.quad}
        download="Truss Calibration Beam Quad.stl"
      >
        Download the Quad STL
      </a>

      <ImageGrid items={[{ src: images.trussQuad, alt: altText.trussQuad }]} />

      <p>
        Load it into a modern slicer and slice it with settings that print
        accurately and reliably - no warping, curling, or extreme dimensional
        inaccuracy from overspeed.
      </p>

      <p>
        In the preview, make sure seams are not placed on the measurement
        surfaces:
      </p>
      <ul>
        <li>These walls are used for outer measurements.</li>
        <li>These walls are used for inner measurements.</li>
      </ul>

      <ImageGrid
        items={[
          { src: images.slicerLoaded, alt: altText.slicerLoaded },
          {
            src: images.outerMeasurementWalls,
            alt: altText.outerMeasurementWalls,
          },
          {
            src: images.innerMeasurementWalls,
            alt: altText.innerMeasurementWalls,
          },
          { src: images.seamVisibility, alt: altText.seamVisibility },
        ]}
      />

      <p>
        In Orca/Bambu you may need to enable seam visibility in the preview. If
        the slicer placed seams on those surfaces, relocate them elsewhere using
        the seam tool - the protrusion can interfere with measurement.
      </p>

      <ImageGrid
        items={[
          { src: images.seamTool, alt: altText.seamTool },
          { src: images.outerSeamExample, alt: altText.outerSeamExample },
        ]}
      />
    </FlowLayout>
  )
}
