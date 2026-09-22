import { createSignal } from 'solid-js'
import FlowLayout from '../../components/FlowLayout'
import { CopyButton, ImageGrid, TextField } from '../../components/ui'
import type { AppStore } from '../../lib/appState'
import { altText, images } from '../../lib/assets'
import {
  finalShrinkagePercent,
  format4dp,
  format5dp,
  singleExtrapolatedRatio,
} from '../../lib/calc'
import { SINGLE_STEPS } from '../../lib/flows'
import { validatePercent } from '../../lib/validation'

export default function S6(props: { app: AppStore }) {
  const [percent, setPercent] = createSignal('100')

  const ratio = () => {
    const x = props.app.measurements().X
    const factor = props.app.selectedPrinter()?.extrapolationFactor ?? 1
    return singleExtrapolatedRatio(x.inner ?? 0, x.outer ?? 0, factor)
  }
  const finalValue = () => finalShrinkagePercent(Number(percent()), ratio())
  const finalText = () => format4dp(finalValue())

  return (
    <FlowLayout
      app={props.app}
      screens={SINGLE_STEPS}
      screen="s6"
      title="Set the filament shrinkage"
      printerName={props.app.selectedPrinter()?.name}
      onContinue={() => props.app.finishFlow()}
      continueLabel="Finish"
      continueDisabled={!validatePercent(percent())}
    >
      <p>
        In your slicer, edit the filament's settings and locate the XY shrinkage
        option (shown below in Orca / Bambu Studio).
      </p>

      <ImageGrid
        items={[
          { src: images.shrinkageAdjust1, alt: altText.shrinkageAdjust1 },
          { src: images.shrinkageAdjust2, alt: altText.shrinkageAdjust2 },
        ]}
      />

      <p>
        Enter the value currently shown in that field. It defaults to 100% in
        most slicers.
      </p>

      <TextField
        id="s6-percent"
        label="Current XY shrinkage %"
        type="number"
        inputmode="decimal"
        suffix="%"
        value={percent()}
        onInput={setPercent}
      />

      <p class="truss-ratio-sentence">
        Based on the above and a calculated compensation ratio of{' '}
        {format5dp(ratio())}, your calculated filament XY shrinkage is:
      </p>

      <div class="truss-final">
        <p class="truss-final-label">Enter this into your slicer</p>
        <p class="truss-final-value">{finalText()}</p>
        <CopyButton text={finalText()} label="Copy value" />
      </div>
    </FlowLayout>
  )
}
