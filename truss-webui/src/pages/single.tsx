import { For } from 'solid-js'
import type { AppApi } from '../lib/app-api.ts'
import { FlowFrame } from '../components/FlowFrame.tsx'
import { BeamFields } from '../components/BeamFields.tsx'
import { Figure, InnerJawGuidance, MeasurementWarnings } from '../components/Guide.tsx'
import { Icon } from '../components/Icon.tsx'
import { icons } from '../lib/icons.ts'
import { ResultPercent } from '../components/ResultPercent.tsx'
import {
  calcRecommendedXYPercent,
  calcSingleShrinkage,
  formatPercent,
  formatShrinkage,
  isPercentOutOfRange,
  namesMatch,
  parsePositiveDecimal,
  xAverage,
} from '../lib/calc.ts'
import { img, stl } from '../lib/assets.ts'

export function SinglePrinter(props: { app: AppApi }) {
  const selected = () => props.app.active()!.selectedPrinterName
  const printers = () => props.app.printers()

  return (
    <FlowFrame
      app={props.app}
      title="Select a printer"
      onNext={() => props.app.setStep('single-filament')}
      nextDisabled={selected() === ''}
    >
      <p>Select the saved printer you are calibrating with.</p>

      {printers().length === 0 ? (
        <p class="truss-note">
          No printers are saved. Run a Quad-Beam calibration first, or add or import a printer from Manage
          printers menu.
        </p>
      ) : (
        <fieldset class="truss-printer-picker">
          <legend>Choose a saved printer</legend>
          <For each={printers()}>
            {(printer) => (
              <label class="truss-radio">
                <input
                  type="radio"
                  name="truss-single-printer"
                  value={printer.name}
                  checked={selected() === printer.name}
                  onChange={() => props.app.selectPrinter(printer.name)}
                />
                <span>{printer.name}</span>
              </label>
            )}
          </For>
        </fieldset>
      )}
    </FlowFrame>
  )
}

export function SingleFilament(props: { app: AppApi }) {
  const tuning = () => props.app.active()!.tuning
  const complete = () => tuning().temperature && tuning().pressure && tuning().flow

  return (
    <FlowFrame
      app={props.app}
      title="Filament tuning"
      onBack={props.app.back}
      onNext={() => props.app.setStep('single-slice')}
      nextDisabled={!complete()}
    >
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
    </FlowFrame>
  )
}

export function SingleSlice(props: { app: AppApi }) {
  return (
    <FlowFrame app={props.app} title="Slice the Single beam" onBack={props.app.back} onNext={() => props.app.setStep('single-print')}>
      <p>
        Download the single-beam calibration model and slice it in your slicer. <br/>
        This guide covers OrcaSlicer / Bambu Studio; adapt the steps as necessary for other slicers.
      </p>

      <p>
        <a class="button truss-icon-label" href={stl.single} download="Truss Calibration Beam Single.stl">
          <Icon svg={icons.downloadSimple} />
          Download the Single calibration beam (STL)
        </a>
      </p>

      <Figure src={img.trussSingle} alt="The Single Truss calibration beam design" caption="The Single-Beam design." />
      <Figure src={img.slicedSingle} alt="The Single beam sliced in a slicer" caption="Keep seams off the measurement faces." />

      <h3>Ensure no seams on measurement surfaces</h3>
      <p>
        As per the quad-beam calibration flow, ensure that there are no seams placed on the walls used for measurement. <br/>
        Enable seam visibility if needed; if any seams need to be moved, adjust seam placement settings or use a manual seam painting tool.
      </p>
      <p>
        The locations of the measurement walls for the quad-beam design are shown below for reference; simply check the ends of the single beam for the single beam file.
      </p>

      <div class="truss-image-grid">
        <Figure src={img.outerMeasurementWalls} alt="Walls used for outer measurements" caption="Walls for outer measurements." />
        <Figure src={img.innerMeasurementWalls} alt="Walls used for inner measurements" caption="Walls for inner measurements." />
        <Figure src={img.seamVisibility} alt="Enabling seam visibility in the slicer preview" caption="Enabling seam visibility." />
        <Figure src={img.seamTool} alt="The slicer's seam painting tool" caption="The seam painting tool in OrcaSlicer/Bambu Studio." />
      </div>
      <Figure src={img.outerSeamExample} alt="A seam relocated away from the measurement face" caption="Specifying seam location away from measurement walls using the seam paint tool." />
    </FlowFrame>
  )
}

export function SinglePrint(props: { app: AppApi }) {
  return (
    <FlowFrame app={props.app} title="Print and remove" onBack={props.app.back} onNext={() => props.app.setStep('single-measure')}>
      <p>Print the sliced file.</p>
      <Figure src={img.printingSingle} alt="The Single beam being printed" />
      <div class="truss-callout">
        <h3>Removing the print</h3>
        <p>
          <strong>Do not force the print off the build plate</strong> - this may warp the print and render
          the measurements meaningless. <br/>
          Wait for the print to fully cool, then remove it from the build plate. <br/>
          <strong>Do not measure the print while it is still attached to the build plate.</strong>
        </p>
      </div>
      <Figure src={img.singlePrinted} alt="A finished, cooled Single beam print" />
    </FlowFrame>
  )
}

export function SingleMeasure(props: { app: AppApi }) {
  const beam = () => props.app.active()!.single
  const complete = () =>
    parsePositiveDecimal(beam().outer) !== null && parsePositiveDecimal(beam().inner) !== null

  return (
    <FlowFrame
      app={props.app}
      title="Measure the X beam"
      onBack={props.app.back}
      onNext={() => props.app.setStep('single-result')}
      nextDisabled={!complete()}
    >
      <MeasurementWarnings />

      <p>Measure these two dimensions across the beam - the inner and outer.</p>
      <p>Tap/click the images to enlarge them as necessary and to zoom further.</p>
      <div class="truss-image-grid">
        <Figure src={img.outerMeasurementSingle} alt="Diagram of the outer measurement on the Single beam" caption="Outer measurement." />
        <Figure src={img.singleMeasurementOuter} alt="Photo of the outer measurement with calipers" />
        <Figure src={img.innerMeasurementSingle} alt="Diagram of the inner measurement on the Single beam" caption="Inner measurement." />
        <Figure src={img.singleMeasurementInner} alt="Photo of the inner measurement with calipers" />
      </div>

      <InnerJawGuidance
        note={
          <p class="truss-note">
            These positioning photos are from the quad-beam design; the same warnings apply all variants.
          </p>
        }
      />
      <BeamFields
        idPrefix="single-x"
        legend="X beam"
        beam={beam()}
        onChange={(patch) => props.app.updateSingleBeam(patch)}
      />
    </FlowFrame>
  )
}

export function SingleResult(props: { app: AppApi }) {
  const active = () => props.app.active()!
  const printer = () =>
    props.app.printers().find((candidate) => namesMatch(candidate.name, active().selectedPrinterName))

  const complete = () =>
    parsePositiveDecimal(active().single.outer) !== null &&
    parsePositiveDecimal(active().single.inner) !== null

  const xAvg = () =>
    xAverage(parsePositiveDecimal(active().single.outer)!, parsePositiveDecimal(active().single.inner)!)
  const shrinkage = () => {
    const saved = printer()
    if (!saved || !complete()) return null
    return calcSingleShrinkage(xAvg(), saved.extrapolationFactor)
  }

  const currentParsed = () => parsePositiveDecimal(active().single.currentXY)
  const currentValid = () => currentParsed() !== null
  const recommended = () => {
    const value = shrinkage()
    const current = currentParsed()
    return value === null || current === null ? null : calcRecommendedXYPercent(current, value)
  }
  const percentWarning = () => {
    const current = currentParsed()
    return current !== null && isPercentOutOfRange(current)
      ? 'This percentage is outside the usual 90–110% range. Double-check the value your slicer shows.'
      : undefined
  }

  return (
    <FlowFrame
      app={props.app}
      title="Single calibration result"
      onNext={props.app.finish}
      nextLabel="Finish"
      nextClass="truss-button-secondary"
      nextDisabled={!currentValid()}
    >
      {!printer() || shrinkage() === null ? (
        <p class="truss-error" role="alert">
          The selected printer could not be found. Go back and choose another saved printer.
        </p>
      ) : (
        <p>
          Extrapolated filament XY shrinkage value for this print:{' '}
          <strong>{formatShrinkage(shrinkage()!)}</strong>
        </p>
      )}

      <div class="truss-field">
        <label for="single-current-xy">Current XY shrinkage percentage in your slicer (%)</label>
        <input
          id="single-current-xy"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          value={active().single.currentXY}
          aria-describedby={
            [
              percentWarning() ? 'single-current-xy-warning' : '',
              !currentValid() ? 'single-current-xy-error' : '',
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
          onInput={(event) => props.app.updateSingle({ currentXY: event.currentTarget.value })}
        />
        {percentWarning() && (
          <p id="single-current-xy-warning" class="truss-warning" role="status">
            {percentWarning()}
          </p>
        )}
        {!currentValid() && (
          <p id="single-current-xy-error" class="truss-error" role="alert">
            Enter a positive number, using a period as the decimal separator.
          </p>
        )}
      </div>

      <ResultPercent percent={recommended() === null ? null : formatPercent(recommended()!)} />

      <h3>Applying the result (OrcaSlicer / Bambu Studio)</h3>
      <p>
        Edit the filament's settings and locate the XY shrinkage option. Multiply the existing value by
        the shrinkage value above. For example, a shrinkage of 0.987 with an existing 100% gives
        98.7%.
      </p>
      <div class="truss-image-grid">
        <Figure src={img.shrinkageAdjust1} alt="Locating the XY shrinkage setting in the filament settings" caption="Locate XY shrinkage." />
        <Figure src={img.shrinkageAdjust2} alt="The XY shrinkage value adjusted to the calculated percentage" caption="Enter the updated percentage." />
      </div>
      <p class="truss-note">
        Using a different slicer? Adapt these instructions to find the equivalent per-filament XY
        shrinkage setting.
      </p>
    </FlowFrame>
  )
}
