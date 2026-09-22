import FlowLayout from '../../components/FlowLayout'
import { ImageGrid } from '../../components/ui'
import type { AppStore } from '../../lib/appState'
import { altText, images, stl } from '../../lib/assets'
import { SINGLE_STEPS } from '../../lib/flows'

export default function S3(props: { app: AppStore }) {
  return (
    <FlowLayout
      app={props.app}
      screens={SINGLE_STEPS}
      screen="s3"
      title="Slice the Single file"
      printerName={props.app.selectedPrinter()?.name}
      onBack={() => props.app.back()}
      onContinue={() => props.app.go('s4')}
    >
      <a
        class="truss-download"
        href={stl.single}
        download="Truss Calibration Beam Single.stl"
      >
        Download the Single STL
      </a>

      <p>
        Load it into a modern slicer and slice it as described in the Quad
        guide. Make sure no seams exist on the measurement faces.
      </p>

      <ImageGrid
        items={[
          { src: images.trussSingle, alt: altText.trussSingle },
          { src: images.slicedSingle, alt: altText.slicedSingle },
        ]}
      />
    </FlowLayout>
  )
}
