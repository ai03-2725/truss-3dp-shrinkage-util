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
      <p>Select the saved printer you are calibrating. Its stored extrapolation factor is applied to your measurements.</p>

      {printers().length === 0 ? (
        <p class="truss-note">
          No printers are saved. Run a Quad calibration first, or add or import a printer from Manage
          printers.
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
      <p>Make sure your filament has undergone prerequisite calibration.</p>
      <ul class="truss-checklist">
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={tuning().temperature}
              onChange={(event) => props.app.updateTuning({ temperature: event.currentTarget.checked })}
            />
            <span>
              <strong>Temperature settings.</strong> The manufacturer's recommended settings are
              usually enough; any issues will usually become evident in the later calibrations.
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
              <strong>Pressure Advance / Flow Dynamics.</strong> Calibrate it and make sure the value is
              actually applied to the printer before starting.
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
              <strong>Flow rate.</strong> Calibrate it with your slicer's built-in tools before starting.
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
        Download the Single calibration beam and slice it as described in the Quad guide. Make sure no
        seams exist on the measurement faces.
      </p>

      <p>
        <a class="button truss-icon-label" href={stl.single} download="Truss Calibration Beam Single.stl">
          <Icon svg={icons.downloadSimple} />
          Download the Single calibration beam (STL)
        </a>
      </p>

      <Figure src={img.trussSingle} alt="The Single Truss calibration beam design" caption="The Single design." />
      <Figure src={img.slicedSingle} alt="The Single beam sliced in a slicer" caption="Keep seams off the measurement faces." />
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
          <strong>Do not force the print off the build plate.</strong> This may warp the print and make
          the measurements meaningless. Wait for the print to fully cool, then remove it. Do not
          measure the print while it is still attached to a build plate.
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

      <p>Measure these two dimensions across the X beam.</p>
      <div class="truss-image-grid">
        <Figure src={img.outerMeasurementSingle} alt="Diagram of the outer measurement on the Single beam" caption="Outer measurement." />
        <Figure src={img.singleMeasurementOuter} alt="Photo of the outer measurement with calipers" />
        <Figure src={img.innerMeasurementSingle} alt="Diagram of the inner measurement on the Single beam" caption="Inner measurement." />
        <Figure src={img.singleMeasurementInner} alt="Photo of the inner measurement with calipers" />
      </div>

      <InnerJawGuidance
        note={
          <p class="truss-note">
            These positioning photos are from the Quad design, but apply to all variants equally.
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
