// English formatted guidance shared by both flows. Paragraph order and figure
// placement may differ per locale; behavior is unaffected.
import type { JSX } from 'solid-js'
import { img } from '../../lib/assets.ts'
import { Figure } from '../../components/Figure.tsx'

// Shared caliper cautions used by both flows' measurement screens.
export function MeasurementWarningsContent() {
  return (
    <div class="truss-callout">
      <h3>Before measuring</h3>
      <ol>
        <li>
          <strong>Do not apply excess force with your calipers.</strong> The Truss Calibrator is designed to 
          resist abuse as much as possible, but all 3D printed plastics are elastic. Applying excess
          force deforms the print and yields dimensions larger or smaller than actually printed. <br/>
          Ideally the calipers should exert no force at all - let go of the clamping side and let the
          print push the calipers back if necessary. If your calipers have thumb-wheel rollers, do
          not use them to exert excess force.
        </li>
        <li>
          <strong>Measure parallel to the dimension.</strong> Excessively angled calipers will fail
          to measure the dimension correctly.
        </li>
      </ol>
    </div>
  )
}

// Inner-jaw orientation guidance; the photos are from the Quad design but apply
// to every variant.
export function InnerJawGuidanceContent(props: { note?: JSX.Element }) {
  return (
    <div class="truss-guidance">
      <h3>Measuring the inner dimension</h3>
      <p>
        Please ensure that your calipers are positioned properly as described below.
      </p>
      {props.note}

      <h4>Correct</h4>
      <ul>
        <li>
          The calipers enter from the <strong>top of the print</strong>.
          <Figure src={img.caliperEnterTop} alt="Caliper entering the print from the top" />
        </li>
        <li>
          The <strong>flat inner sides of the caliper are flush</strong> against the supportive walls located halfway
          across the beam.
          <Figure
            src={img.innerCorrect1}
            alt="Inner caliper jaws flush against the supportive wall on one end"
          />
        </li>
        <li>
          The same is true for <strong>both ends</strong> of the caliper (watch out for one side slipping out of position while positioning the other).
          <Figure
            src={img.innerCorrect2}
            alt="Inner caliper jaws flush against the supportive wall on the other end"
          />
        </li>
      </ul>

      <h4>Incorrect</h4>
      <ul>
        <li>
          Incorrect: The calipers' inner flat sides are not making contact against the supportive walls. This
          yields a diagonal measurement longer than what is printed.
          <Figure
            src={img.calipersIncorrectGap}
            alt="Incorrect inner measurement with a gap between the jaw and the wall"
          />
        </li>
        <li>
          Incorrect: The calipers are being used from the bottom of the print. The slanted sides of the caliper
          teeth should never face the supportive walls in the middle.
          <Figure
            src={img.calipersIncorrectSide}
            alt="Incorrect inner measurement taken from the bottom of the print"
          />
        </li>
      </ul>
    </div>
  )
}
