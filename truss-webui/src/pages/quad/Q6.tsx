import { createSignal } from 'solid-js'
import FlowLayout from '../../components/FlowLayout'
import { ImageGrid, TextField } from '../../components/ui'
import type { AppStore } from '../../lib/appState'
import { altText, images } from '../../lib/assets'
import { quadScreens } from '../../lib/flows'
import { MEASUREMENT_WARNING, validateMeasurement } from '../../lib/validation'

export default function Q6(props: { app: AppStore }) {
  const [outer, setOuter] = createSignal(
    props.app.measurements().X.outer?.toString() ?? '',
  )
  const [inner, setInner] = createSignal(
    props.app.measurements().X.inner?.toString() ?? '',
  )

  const warningFor = (raw: string) => {
    const result = validateMeasurement(raw)
    return result.valid && result.warn ? MEASUREMENT_WARNING : undefined
  }

  const valid = () =>
    validateMeasurement(outer()).valid && validateMeasurement(inner()).valid

  const proceed = () => {
    props.app.setMeasurement('X', 'outer', Number(outer()))
    props.app.setMeasurement('X', 'inner', Number(inner()))
    props.app.go('q7')
  }

  return (
    <FlowLayout
      app={props.app}
      screens={quadScreens(props.app.prefs().skipPrerequisiteCheck)}
      screen="q6"
      title="Measure the X-beam"
      onBack={() => props.app.back()}
      onContinue={proceed}
      continueDisabled={!valid()}
    >
      <p>Before measuring, note these two warnings:</p>
      <ol>
        <li>
          <strong>
            Do not apply excess force to the print with your calipers.
          </strong>{' '}
          3D printed plastics are elastic - excess force will deform the print
          and give dimensions larger or smaller than actually printed. Ideally
          the calipers should exert no force at all; let go of the clamping side
          and let the print push the calipers back if necessary. Do not use
          thumb-wheel rollers to force measurement.
        </li>
        <li>
          Measure with the calipers parallel to the dimension you are measuring
          - excessively angled calipers will fail to measure correctly.
        </li>
      </ol>

      <p>Measure the following dimensions across the X-beam:</p>
      <ul>
        <li>
          Across these two walls using the outer measurement teeth of your
          calipers.
        </li>
        <li>
          Within these two walls using the inner measurement teeth of your
          calipers.
        </li>
      </ul>

      <ImageGrid
        items={[
          { src: images.xOuterDiagram, alt: altText.xOuterDiagram },
          { src: images.xOuterMeasurement, alt: altText.xOuterMeasurement },
          { src: images.xInnerDiagram, alt: altText.xInnerDiagram },
          { src: images.xInnerMeasurement, alt: altText.xInnerMeasurement },
        ]}
      />

      <p>
        <strong>Warning:</strong> The file is designed to guide your calipers'
        inner teeth accurately, but only when oriented correctly. Measuring
        incorrectly will yield incorrect, meaningless values.
      </p>

      <p>
        <strong>Correct:</strong> the caliper enters from the top, and its flat
        inner sides are flush against the support walls halfway across the beam,
        on both ends.
      </p>

      <ImageGrid
        items={[
          { src: images.caliperEnterTop, alt: altText.caliperEnterTop },
          { src: images.innerCorrect1, alt: altText.innerCorrect1 },
          { src: images.innerCorrect2, alt: altText.innerCorrect2 },
        ]}
      />

      <p>
        <strong>Incorrect:</strong> a gap between the caliper and the support
        walls gives a diagonal measurement longer than the print; using the
        caliper from the bottom puts the slanted teeth against the support
        walls.
      </p>

      <ImageGrid
        items={[
          {
            src: images.calipersIncorrectGap,
            alt: altText.calipersIncorrectGap,
          },
          {
            src: images.calipersIncorrectSide,
            alt: altText.calipersIncorrectSide,
          },
        ]}
      />

      <h2 class="truss-group-title">Enter the X measurements</h2>
      <TextField
        id="q6-outer"
        label="X - Outer"
        type="number"
        inputmode="decimal"
        suffix="mm"
        value={outer()}
        onInput={setOuter}
        warning={warningFor(outer())}
      />
      <TextField
        id="q6-inner"
        label="X - Inner"
        type="number"
        inputmode="decimal"
        suffix="mm"
        value={inner()}
        onInput={setInner}
        warning={warningFor(inner())}
      />
    </FlowLayout>
  )
}
