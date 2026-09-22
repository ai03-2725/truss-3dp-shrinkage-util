import FlowLayout from '../../components/FlowLayout'
import { ImageGrid } from '../../components/ui'
import type { AppStore } from '../../lib/appState'
import { altText, images } from '../../lib/assets'
import { quadScreens } from '../../lib/flows'

export default function Q4(props: { app: AppStore }) {
  return (
    <FlowLayout
      app={props.app}
      screens={quadScreens(props.app.prefs().skipPrerequisiteCheck)}
      screen="q4"
      title="Print the beam"
      onBack={() => props.app.back()}
      onContinue={() => props.app.go('q5')}
    >
      <p>Print the sliced file.</p>

      <ImageGrid
        items={[{ src: images.printingQuad, alt: altText.printingQuad }]}
      />

      <p>
        Once printed,{' '}
        <strong>do not force the print off the build plate</strong> - this may
        warp the print and render the measurements meaningless. Wait for it to
        fully cool, then remove it. Do not measure the print while it is
        attached to the build plate.
      </p>

      <ImageGrid
        items={[{ src: images.finishedPrint, alt: altText.finishedPrint }]}
      />
    </FlowLayout>
  )
}
