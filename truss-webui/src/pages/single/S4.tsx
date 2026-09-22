import FlowLayout from '../../components/FlowLayout'
import { ImageGrid } from '../../components/ui'
import type { AppStore } from '../../lib/appState'
import { altText, images } from '../../lib/assets'
import { SINGLE_STEPS } from '../../lib/flows'

export default function S4(props: { app: AppStore }) {
  return (
    <FlowLayout
      app={props.app}
      screens={SINGLE_STEPS}
      screen="s4"
      title="Print the beam"
      printerName={props.app.selectedPrinter()?.name}
      onBack={() => props.app.back()}
      onContinue={() => props.app.go('s5')}
    >
      <p>Print the sliced file.</p>

      <ImageGrid
        items={[{ src: images.printingSingle, alt: altText.printingSingle }]}
      />

      <p>
        Once printed,{' '}
        <strong>do not force the print off the build plate</strong> - this may
        warp the print and render the measurements meaningless. Wait for it to
        fully cool, then remove it. Do not measure the print while it is
        attached to the build plate.
      </p>
    </FlowLayout>
  )
}
