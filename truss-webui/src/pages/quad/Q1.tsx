import { createSignal } from 'solid-js'
import FlowLayout from '../../components/FlowLayout'
import { Checkbox } from '../../components/ui'
import type { AppStore } from '../../lib/appState'
import { quadScreens } from '../../lib/flows'

export default function Q1(props: { app: AppStore }) {
  const [calipers, setCalipers] = createSignal(false)
  const [printer, setPrinter] = createSignal(false)
  const [slicer, setSlicer] = createSignal(false)
  const [dontAsk, setDontAsk] = createSignal(false)

  const allChecked = () => calipers() && printer() && slicer()

  const proceed = () => {
    if (dontAsk()) props.app.setSkipPrerequisiteCheck(true)
    props.app.go('q2')
  }

  return (
    <FlowLayout
      app={props.app}
      screens={quadScreens(props.app.prefs().skipPrerequisiteCheck)}
      screen="q1"
      title="Before you start"
      onContinue={proceed}
      continueDisabled={!allChecked()}
    >
      <p>
        Thank you for choosing the Truss calibrator. Make sure you have the
        three things you need:
      </p>

      <Checkbox
        id="q1-calipers"
        checked={calipers()}
        onChange={setCalipers}
        label={
          <>
            <strong>A decent modern pair of digital calipers.</strong> It must
            measure a 140mm object (150mm range or wider) and repeat a few
            dimensions without drift. Check by measuring a rigid object over
            100mm about ten times; after each, the jaws should close back to
            0.00mm.
          </>
        }
      />
      <Checkbox
        id="q1-printer"
        checked={printer()}
        onChange={setPrinter}
        label={
          <>
            <strong>A functional, calibrated modern printer.</strong> If it is
            DIY, make sure all motion is calibrated. Klipper users should
            calibrate skew correction first. It must print without warping and
            have a build plate of at least 150x150mm.
          </>
        }
      />
      <Checkbox
        id="q1-slicer"
        checked={slicer()}
        onChange={setSlicer}
        label={
          <>
            <strong>A modern slicer.</strong> It should slice the calibrator
            reliably and ideally expose a per-filament XY shrinkage setting (for
            example OrcaSlicer, Bambu Studio, SuperSlicer or Cura).
          </>
        }
      />

      <div class="truss-group">
        <Checkbox
          id="q1-dont-ask"
          checked={dontAsk()}
          onChange={setDontAsk}
          disabled={!allChecked()}
          label="Don't ask again - skip this checklist next time."
        />
      </div>
    </FlowLayout>
  )
}
