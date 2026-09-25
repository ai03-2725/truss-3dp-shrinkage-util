// Japanese page content for the Quad flow. PLACEHOLDER: currently English wording,
// to be translated before public release (implementation-plan task 9). Layout/figure
// order may differ from English; gating/navigation come from the shared containers.
import { For } from 'solid-js'
import type { AppApi } from '../../lib/app-api.ts'
import type { BeamInput, QuadInput } from '../../lib/types.ts'
import { BeamFields } from '../../components/BeamFields.tsx'
import { Figure, InnerJawGuidance, MeasurementWarnings } from '../../components/Guide.tsx'
import { Icon } from '../../components/Icon.tsx'
import { ResultPercent } from '../../components/ResultPercent.tsx'
import { icons } from '../../lib/icons.ts'
import { messages } from '../../lib/messages.ts'
import { img, stl } from '../../lib/assets.ts'

export function QuadEquipmentContent(props: { app: AppApi; complete: boolean }) {
  const equipment = () => props.app.active()!.equipment

  return (
    <>
      <p>Make sure you have all three of these prerequisites before starting.</p>
      <ul class="truss-checklist">
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={equipment().calipers}
              onChange={(event) => props.app.updateEquipment({ calipers: event.currentTarget.checked })}
            />
            <span>
              <strong>A decent modern pair of digital calipers.</strong> <br/>
              The calipers should be wide enough to measure a 140mm wide object.<br/>
              In addition, they should measure reliably without error or drift.<br/>
            </span>
          </label>
        </li>
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={equipment().printer}
              onChange={(event) => props.app.updateEquipment({ printer: event.currentTarget.checked })}
            />
            <span>
              <strong>A functional, calibrated modern printer.</strong> <br/>
              The printer should be able to print a 140mm wide object reliably without warping, curling, or deforming. <br/>
              For DIY printers, ensure that all motion is properly calibrated beforehand; ideally printers running Klipper should have XY skew compensation calculated and enabled.
            </span>
          </label>
        </li>
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={equipment().slicer}
              onChange={(event) => props.app.updateEquipment({ slicer: event.currentTarget.checked })}
            />
            <span>
              <strong>A modern slicer.</strong> <br/>
              The slicer should be able to slice a provided simple model reliably, and should expose a per-filament XY shrinkage setting (for example OrcaSlicer, Bambu Studio, or SuperSlicer.).
            </span>
          </label>
        </li>
      </ul>

      <label class="truss-checkbox truss-dont-ask">
        <input
          type="checkbox"
          disabled={!props.complete}
          checked={props.app.skipEquipment()}
          onChange={(event) => props.app.setSkipEquipment(event.currentTarget.checked)}
        />
        <small>Don't ask again - skip this screen on future calibration runs</small>
      </label>
    </>
  )
}

export function QuadFilamentContent(props: { app: AppApi }) {
  const tuning = () => props.app.active()!.tuning

  return (
    <>
      <p>Make sure your filament has completed all prerequisite tuning.</p>
      <ul class="truss-checklist">
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={tuning().temperature}
              onChange={(event) => props.app.updateTuning({ temperature: event.currentTarget.checked })}
            />
            <span>
              <strong>Temperature settings.</strong><br/>
              The manufacturer's recommended settings are usually enough. <br/>
              If you are printing a temperature tower, breaking it to test layer adhesion is strongly recommended.
            </span>
          </label>
        </li>
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={tuning().pressure}
              onChange={(event) => props.app.updateTuning({ pressure: event.currentTarget.checked })}
            />
            <span>
              <strong>Pressure Advance / Flow Dynamics.</strong> <br/>
              It is recommended to use OrcaSlicer's calibration utilities (top menu bar → calibration → Pressure Advance) or Bambu Studio's calibration page (Calibration tab → Flow dynamics). <br/> 
              Make sure the chosen value is properly applied to the printer (Bambu may need the K value selected from Device → Filament; Klipper devices may need to receive the <code>pressure_advance[0]</code> value or similar via start gcode.).
            </span>
          </label>
        </li>
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={tuning().flow}
              onChange={(event) => props.app.updateTuning({ flow: event.currentTarget.checked })}
            />
            <span>
              <strong>Flow Rate / Flow Ratio.</strong> <br/>
              It is recommended to use OrcaSlicer's calibration utilities (top menu bar → calibration → Flow Ratio; "YOLO single-pass" method highly recommended) or Bambu Studio's calibration page (Calibration tab → Flow rate). <br/> 
              If using Bambu Studio's built-in two-pass calibration, pick the higher value when torn between two chips on the first pass - the
              second pass only tests values below the first.
            </span>
          </label>
        </li>
      </ul>
    </>
  )
}

export function QuadSliceContent() {
  return (
    <>
      <p>
        Download the quad-beam calibration model and slice it in your slicer. <br/>
        This guide covers OrcaSlicer / Bambu Studio; adapt the steps as necessary for other slicers.
      </p>

      <p>
        <a class="button truss-icon-label" href={stl.quad} download="Truss Calibration Beam Quad.stl">
          <Icon svg={icons.downloadSimple} />
          Download the Quad calibration beam (STL)
        </a>
      </p>

      <Figure src={img.trussQuad} alt="The Quad Truss calibration beam design" caption="The Quad-Beam design." />

      <p>
        Slice it with settings that print reliably and accurately - the print should not warp, curl, or overshoot from pushing speed too far.  
      </p>
      <Figure src={img.slicerLoaded} alt="The Quad beam loaded in a slicer" />

      <h3>Ensure no seams on measurement surfaces</h3>
      <p>
        In the sliced preview, ensure that there are no seams placed on the walls used for measurement (shown below). <br/>
        Enable seam visibility if needed; if any seams need to be moved, adjust seam placement settings or use a manual seam painting tool.
      </p>
      <div class="truss-image-grid">
        <Figure src={img.outerMeasurementWalls} alt="Walls used for outer measurements" caption="Walls for outer measurements." />
        <Figure src={img.innerMeasurementWalls} alt="Walls used for inner measurements" caption="Walls for inner measurements." />
        <Figure src={img.seamVisibility} alt="Enabling seam visibility in the slicer preview" caption="Enabling seam visibility." />
        <Figure src={img.seamTool} alt="The slicer's seam painting tool" caption="The seam painting tool in OrcaSlicer/Bambu Studio." />
      </div>
      <Figure src={img.outerSeamExample} alt="A seam relocated away from the measurement face" caption="Specifying seam location away from measurement walls using the seam paint tool." />
    </>
  )
}

export function QuadPrintContent() {
  return (
    <>
      <p>Print the sliced file.</p>
      <Figure src={img.printingQuad} alt="The Quad beam being printed" />
      <div class="truss-callout">
        <h3>Removing the print</h3>
        <p>
          <strong>Do not force the print off the build plate</strong> - this may warp the print and render
          the measurements meaningless. <br/>
          Wait for the print to fully cool, then remove it from the build plate. <br/>
          <strong>Do not measure the print while it is still attached to the build plate.</strong>
        </p>
      </div>
      <Figure src={img.finishedPrint} alt="A finished, cooled Quad beam print" caption="Let the print cool before removing and measuring." />
    </>
  )
}

export function QuadLocateContent() {
  return (
    <>
      <p>
        Locate the X beam along the X axis. It is marked with an <strong>X</strong> label on the print.
      </p>
      <p>
        Note: The letters were enlarged from the prototype shown below; your printed copy will be easier to read/identify.
      </p>
      <Figure src={img.xBeam} alt="The X beam marked with an X label on the print" />
    </>
  )
}

export function QuadXContent(props: { app: AppApi; beam: BeamInput }) {
  return (
    <>
      <MeasurementWarnings />

      <p>Measure these two dimensions across the X beam - the inner and outer.</p>
      <p>Tap/click the images to enlarge them as necessary and to zoom further.</p>
      <div class="truss-image-grid">
        <Figure src={img.xOuterDiagram} alt="Diagram of the outer X measurement" caption="Outer measurement." />
        <Figure src={img.xOuterMeasurement} alt="Photo of the outer X measurement with calipers" />
        <Figure src={img.xInnerDiagram} alt="Diagram of the inner X measurement" caption="Inner measurement." />
        <Figure src={img.xInnerMeasurement} alt="Photo of the inner X measurement with calipers" />
      </div>

      <InnerJawGuidance />

      <p>After measuring the dimensions, enter the values below. <br/>
      Ensure that you are measuring the correct beam at all times (the one marked X).</p>
      <BeamFields
        idPrefix="quad-x"
        legend="X beam"
        beam={props.beam}
        onChange={(patch) => props.app.updateQuadBeam('x', patch)}
      />
    </>
  )
}

export function QuadYabContent(props: { app: AppApi; quad: QuadInput }) {
  const axes = [
    { axis: 'y' as const, label: 'Y' },
    { axis: 'a' as const, label: 'A' },
    { axis: 'b' as const, label: 'B' },
  ]

  return (
    <>
      <p>
        Repeat the same two inner/outer measurements for the remaining three beams. <br/> 
        Ensure that you are measuring the correct beam and typing the values into the correct boxes.
      </p>
      <div class="truss-callout">
        <p>
          Follow the same cautions as with the X beam - no excess force, parallel alignment, and measuring the inner beam correctly. 
        </p>
        <p>
          Use the back button at the bottom of the page to check the previous step at any time - your values are saved as they are entered.
        </p>
      </div>

      <p class="truss-note">
        X beam values already entered: outer {props.quad.x.outer || '—'} mm, inner {props.quad.x.inner || '—'} mm
      </p>

      <For each={axes}>
        {(entry) => (
          <BeamFields
            idPrefix={`quad-${entry.axis}`}
            legend={`${entry.label} beam`}
            beam={props.quad[entry.axis]}
            onChange={(patch) => props.app.updateQuadBeam(entry.axis, patch)}
          />
        )}
      </For>
    </>
  )
}

export function QuadNameContent(props: { app: AppApi; name: string; duplicate: boolean }) {
  return (
    <>
      <p>
        The printer's characteristics will be saved to the browser - this allows use of the single-beam rapid calibration flow in the future.  <br/>
        Please give this printer an identifiable name; if you have multiple of the same printer model, make sure that the name can tell the specific printer apart.
      </p>
      <p class="truss-note">
        The factor is specific to this printer, and only holds while its skew stays consistent. If you
        change the printer's skew settings later via skew compensation or printer teardown, re-run the quad-beam calibration flow.
      </p>

      <div class="truss-field">
        <label for="quad-printer-name">Printer name</label>
        <input
          id="quad-printer-name"
          type="text"
          autocomplete="off"
          value={props.name}
          aria-describedby={
            [props.duplicate ? 'quad-printer-name-warning' : '', props.name.trim() === '' ? 'quad-printer-name-error' : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          onInput={(event) => props.app.updateQuad({ printerName: event.currentTarget.value })}
        />
        {props.name.trim() === '' && (
          <p id="quad-printer-name-error" class="truss-error" role="alert">
            Enter a printer name.
          </p>
        )}
        {props.duplicate && (
          <p id="quad-printer-name-warning" class="truss-warning" role="status">
            A printer named “{props.name.trim()}” already exists. Continuing will overwrite its saved
            factor.
          </p>
        )}
      </div>
    </>
  )
}

export function QuadResultContent(props: {
  app: AppApi
  shrinkage: string
  factor: number
  recommendedPercent: string | null
  currentValid: boolean
  percentWarning: boolean
}) {
  const quad = () => props.app.active()!.quad
  const t = () => messages(props.app.locale())

  return (
    <>
      <small>
        Measured shrinkage ratio for this print: <strong>{props.shrinkage}</strong>
      </small>

      {props.app.active()!.quadSaveFailed && (
        <div class="truss-callout truss-callout-warning">
          <h3>Printer extrapolation factor could not be saved</h3>
          <p>
            Your browser storage is unavailable, so this printer's skew information was not saved for future single-beam calibrations.
            Note it down manually so you can add it in Manage printers later:
          </p>
          <p class="truss-factor">
            <strong>{String(props.factor)}</strong>
          </p>
        </div>
      )}

      <h3>Find your current filament XY shrinkage settings</h3>
      <p>
        Edit the filament's settings and locate its current XY shrinkage value - this usually defaults to 100%. <br/>
        Please enter it below.  
      </p>
      <Figure src={img.shrinkageAdjust1} alt="Locating the XY shrinkage setting in the filament settings" caption="XY shrinkage location in OrcaSlicer/Bambu Studio." />

      <div class="truss-field">
        <label for="quad-current-xy">Current XY shrinkage percentage in your slicer (%)</label>
        <input
          id="quad-current-xy"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          value={quad().currentXY}
          aria-describedby={
            [props.percentWarning ? 'quad-current-xy-warning' : '', !props.currentValid ? 'quad-current-xy-error' : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          onInput={(event) => props.app.updateQuad({ currentXY: event.currentTarget.value })}
        />
        {props.percentWarning && (
          <p id="quad-current-xy-warning" class="truss-warning" role="status">
            {t().percentRangeWarning}
          </p>
        )}
        {!props.currentValid && (
          <p id="quad-current-xy-error" class="truss-error" role="alert">
            {t().invalidNumber}
          </p>
        )}
      </div>

      <ResultPercent percent={props.recommendedPercent} />

      <h3>Applying the result</h3>
      <p>
        Paste the updated shrinkage percentage from above into the same field you obtained the original shrinkage value from.
      </p>
      <Figure src={img.shrinkageAdjust2} alt="The XY shrinkage value adjusted to the calculated percentage" caption="An example updated percentage." />

      <p>
        For other slicers, adapt the steps as necessary.
      </p>
    </>
  )
}
