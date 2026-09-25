// Japanese page content for About. PLACEHOLDER: currently English wording, to be
// translated before public release (implementation-plan task 9). Layout/paragraph
// order may differ from English; navigation comes from the shared container.
import type { AppApi } from '../../lib/app-api.ts'
import { Icon } from '../../components/Icon.tsx'
import { LocaleSwitcher } from '../../components/LocaleSwitcher.tsx'
import { icons } from '../../lib/icons.ts'
import { Figure } from '../../components/Guide.tsx'
import { img } from '../../lib/assets.ts'

export function AboutContent(props: { app: AppApi }) {
  return (
    <main class="container truss-about">
      <div class="truss-flow-topbar">
        <button
          type="button"
          class="truss-icon-button"
          aria-label="Home"
          onClick={() => props.app.finish()}
        >
          <Icon svg={icons.house} />
        </button>
        <LocaleSwitcher app={props.app} />
      </div>

      <h1>About</h1>
      <img loading='lazy' src="og-truss.jpg" alt="Header image of the truss calibrator" style="width: 100%;"/>
      <p>The Truss Calibrator is a tool designed to calibrate 3D printer filament shrinkage.</p>
      <p>All filaments shrink after printing due to thermal contraction; Truss aims to calculate and correct this behavior with high accuracy and minimized filament waste.</p>
      <br/>
      <p>Specifically, Truss accomplishes the above with the following:</p>
      <ul>
        <li>
          Truss assumes you have modern, accurate calipers capable of measuring a 140mm wide object (most modern calipers have at least 150mm length).
        </li>
        <li>
          With this assumption, Truss uses a "one-shot" long-distance measurement across a 140mm wide dimension rather than multiple small measurements used on other calibrators; this minimizes the effect of measurement errors/noise and yields an accurate shrinkage distance with few measurements required.
        </li>
        <li>
          A truss-beam structure minimizes the amount of filament used for the test print while providing sufficient structural rigidity for the measuring phase.
        </li>
      </ul>
      <br/>
      <p>The Truss calibrator uses two test print variants to balance maximum precision with speed:</p>
      <ul>
        <li>
          First, a four-beam file is provided for printing; this is used to measure the X/Y axes and the two diagonals.<br/>
          This file uses around 10 grams of filament.<br/>
          <Figure src={img.trussQuad} alt="The quad beam design" />
        </li>
        <li>
          Based on these first measurements, Truss calculates an "extrapolation factor" to predict what a four-axis measurement would be from just the X axis measurement; this accounts for the printer's dimensional skew and inequalities.<br/>
          This value is saved within the webapp.
        </li>
        <li>
          For the second run onwards, a single-beam file is provided to measure only the X axis; this file only uses around 2.5 grams of filament.<br/>
          <Figure src={img.trussSingle} alt="The single beam design" />
        </li>
        <li>
          For the single beam calibration runs, the measured X length is multiplied by the saved multiplier to extraploate what the full quad-beam print would yield from just the X beam measurements; this yields an accurate shrinkage compensation value with a tiny amount of filament and minimal number of manual measurements.
        </li>
      </ul>
      <br/>
      <p>The web UI does all of the averaging and multiplying on your behalf for ease of use.</p>
      <small>Note: Printers and their extrapolation factors are currently only saved to the browser's storage; export the printer list to have a backup.</small>
    </main>
  )
}
