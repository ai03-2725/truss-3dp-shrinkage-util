import FlowLayout from '../../components/FlowLayout'
import { ImageGrid } from '../../components/ui'
import type { AppStore } from '../../lib/appState'
import { altText, images } from '../../lib/assets'
import { quadScreens } from '../../lib/flows'

export default function Q5(props: { app: AppStore }) {
  return (
    <FlowLayout
      app={props.app}
      screens={quadScreens(props.app.prefs().skipPrerequisiteCheck)}
      screen="q5"
      title="Locate the X-beam"
      onBack={() => props.app.back()}
      onContinue={() => props.app.go('q6')}
    >
      <p>
        Locate the X-beam along the X axis - it is marked with an X label on the
        print. The letters were enlarged from the prototype stage, so production
        prints should be much easier to read.
      </p>

      <ImageGrid items={[{ src: images.xBeam, alt: altText.xBeam }]} />
    </FlowLayout>
  )
}
