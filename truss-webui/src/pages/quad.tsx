import { For, Show, createSignal } from 'solid-js'
import type { AppApi, QuadAxis } from '../lib/app-api.ts'
import type { QuadInput } from '../lib/types.ts'
import { FlowFrame } from '../components/FlowFrame.tsx'
import { BeamFields } from '../components/BeamFields.tsx'
import { Figure, InnerJawGuidance, MeasurementWarnings } from '../components/Guide.tsx'
import { Icon } from '../components/Icon.tsx'
import { icons } from '../lib/icons.ts'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { ResultPercent } from '../components/ResultPercent.tsx'
import {
  calcPrinterFactor,
  calcQuadShrinkage,
  calcRecommendedXYPercent,
  formatPercent,
  formatShrinkage,
  isPercentOutOfRange,
  parsePositiveDecimal,
  quadAverage,
  xAverage,
} from '../lib/calc.ts'
import { hasNameConflict } from '../lib/printers.ts'
import { img, stl } from '../lib/assets.ts'

function quadReadings(quad: QuadInput): number[] | null {
  const raw = [
    quad.x.outer,
    quad.x.inner,
    quad.y.outer,
    quad.y.inner,
    quad.a.outer,
    quad.a.inner,
    quad.b.outer,
    quad.b.inner,
  ]
  const values = raw.map(parsePositiveDecimal)
  return values.some((value) => value === null) ? null : (values as number[])
}

function Prerequisites(props: { app: AppApi }) {
  const equipment = () => props.app.active()!.equipment
  const complete = () => equipment().calipers && equipment().printer && equipment().slicer

  return (
    <FlowFrame
      app={props.app}
      title="Equipment check"
      onNext={() => props.app.setStep('quad-filament')}
      nextDisabled={!complete()}
    >
      <p>Make sure you have all three of these before calibrating.</p>
      <ul class="truss-checklist">
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={equipment().calipers}
              onChange={(event) => props.app.updateEquipment({ calipers: event.currentTarget.checked })}
            />
            <span>
              <strong>A decent modern pair of digital calipers.</strong> They must measure a 140 mm
              object (150 mm or wider range) and repeat measurements without drift or error. Check by
              measuring a rigid object over 100 mm about 10 times, returning the jaws to zero between
              each attempt; if the zero drifts, calibrate the calipers before reaching that number of
              consecutive measurements.
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
              <strong>A functional, calibrated modern printer</strong> (a modern Bambu or equivalent).
              DIY printers need all motion properly calibrated; Klipper printers should have skew
              correction calibrated first. It must print your filament without warping, curling, or
              deforming, and have a build plate of at least 150×150 mm.
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
              <strong>A modern slicer</strong> that can slice these calibrators accurately and ideally
              exposes a per-filament XY shrinkage setting (for example OrcaSlicer, Bambu Studio,
              SuperSlicer, or Cura).
            </span>
          </label>
        </li>
      </ul>

      <label class="truss-checkbox truss-dont-ask">
        <input
          type="checkbox"
          disabled={!complete()}
          checked={props.app.skipEquipment()}
          onChange={(event) => props.app.setSkipEquipment(event.currentTarget.checked)}
        />
        Don't ask again — skip this screen on future Quad calibrations
      </label>
    </FlowFrame>
  )
}
export { Prerequisites as QuadEquipment }

export function QuadFilament(props: { app: AppApi }) {
  const tuning = () => props.app.active()!.tuning
  const complete = () => tuning().temperature && tuning().pressure && tuning().flow

  return (
    <FlowFrame
      app={props.app}
      title="Filament tuning"
      onBack={props.app.back}
      onNext={() => props.app.setStep('quad-slice')}
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
              usually enough; any issues will usually become evident in the later calibrations. If you
              print a temperature tower, breaking it to check layer adhesion is strongly recommended.
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
              <strong>Pressure Advance / Flow Dynamics.</strong> Use OrcaSlicer's calibration utilities
              or Bambu Studio's calibration page, then make sure the value is actually applied to the
              printer (Bambu may need the K value selected from Device → Filament; Klipper may need a
              per-filament startup macro).
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
              <strong>Flow rate.</strong> Use OrcaSlicer or Bambu Studio's built-in flow rate
              calibration. Orca's “YOLO single-pass” is recommended. If using Bambu Studio's built-in
              calibration, pick the higher value when torn between two chips on the first pass - the
              second pass only tests values under the first.
            </span>
          </label>
        </li>
      </ul>
    </FlowFrame>
  )
}

export function QuadSlice(props: { app: AppApi }) {
  return (
    <FlowFrame app={props.app} title="Slice the Quad beam" onBack={props.app.back} onNext={() => props.app.setStep('quad-print')}>
      <p>
        Download the Quad calibration beam and slice it in a modern slicer. This guide covers
        OrcaSlicer / Bambu Studio; adapt the steps for other slicers.
      </p>

      <p>
        <a class="button truss-icon-label" href={stl.quad} download="Truss Calibration Beam Quad.stl">
          <Icon svg={icons.downloadSimple} />
          Download the Quad calibration beam (STL)
        </a>
      </p>

      <Figure src={img.trussQuad} alt="The Quad Truss calibration beam design" caption="The Quad design." />

      <p>
        Slice it with settings that print accurately and reliably - no warping, curling, or extreme
        dimensional inaccuracy from overspeed.
      </p>
      <Figure src={img.slicerLoaded} alt="The Quad beam loaded in a slicer" />

      <h3>Keep seams off the measurement surfaces</h3>
      <p>
        In the slicer preview, make sure seams are not placed on the walls used for measurement. Enable
        seam visibility if needed, and relocate any seams on those faces with the seam tool.
      </p>
      <div class="truss-image-grid">
        <Figure src={img.outerMeasurementWalls} alt="Walls used for outer measurements" caption="Walls for outer measurements." />
        <Figure src={img.innerMeasurementWalls} alt="Walls used for inner measurements" caption="Walls for inner measurements." />
        <Figure src={img.seamVisibility} alt="Enabling seam visibility in the slicer preview" caption="Enable seam visibility." />
        <Figure src={img.seamTool} alt="The slicer's seam painting tool" caption="Relocate seams with the seam tool." />
      </div>
      <Figure src={img.outerSeamExample} alt="A seam relocated away from the measurement face" caption="A seam moved away from the measurement surface." />
    </FlowFrame>
  )
}

export function QuadPrint(props: { app: AppApi }) {
  return (
    <FlowFrame app={props.app} title="Print and remove" onBack={props.app.back} onNext={() => props.app.setStep('quad-locate')}>
      <p>Print the sliced file.</p>
      <Figure src={img.printingQuad} alt="The Quad beam being printed" />
      <div class="truss-callout">
        <h3>Removing the print</h3>
        <p>
          <strong>Do not force the print off the build plate.</strong> This may warp the print and make
          the measurements meaningless. Wait for the print to fully cool, then remove it. Do not
          measure the print while it is still attached to a build plate.
        </p>
      </div>
      <Figure src={img.finishedPrint} alt="A finished, cooled Quad beam print" caption="Let the print cool before removing and measuring." />
    </FlowFrame>
  )
}

export function QuadLocate(props: { app: AppApi }) {
  return (
    <FlowFrame app={props.app} title="Locate the X beam" onBack={props.app.back} onNext={() => props.app.setStep('quad-x')}>
      <p>
        Locate the X beam along the X axis. It is marked with an <strong>X</strong> label on the print.
        The letters were enlarged from the prototype, so production prints are easy to read.
      </p>
      <Figure src={img.xBeam} alt="The X beam marked with an X label on the print" />
    </FlowFrame>
  )
}

export function QuadX(props: { app: AppApi }) {
  const beam = () => props.app.active()!.quad.x
  const complete = () =>
    parsePositiveDecimal(beam().outer) !== null && parsePositiveDecimal(beam().inner) !== null

  return (
    <FlowFrame
      app={props.app}
      title="Measure the X beam"
      onBack={props.app.back}
      onNext={() => props.app.setStep('quad-yab')}
      nextDisabled={!complete()}
    >
      <MeasurementWarnings />

      <p>Measure these two dimensions across the X beam.</p>
      <div class="truss-image-grid">
        <Figure src={img.xOuterDiagram} alt="Diagram of the outer X measurement" caption="Outer measurement." />
        <Figure src={img.xOuterMeasurement} alt="Photo of the outer X measurement with calipers" />
        <Figure src={img.xInnerDiagram} alt="Diagram of the inner X measurement" caption="Inner measurement." />
        <Figure src={img.xInnerMeasurement} alt="Photo of the inner X measurement with calipers" />
      </div>

      <InnerJawGuidance />
      <BeamFields
        idPrefix="quad-x"
        legend="X beam"
        beam={beam()}
        onChange={(patch) => props.app.updateQuadBeam('x', patch)}
      />
    </FlowFrame>
  )
}

export function QuadYab(props: { app: AppApi }) {
  const quad = () => props.app.active()!.quad
  const allValid = () => quadReadings(quad()) !== null

  const axes: { axis: QuadAxis; label: string }[] = [
    { axis: 'y', label: 'Y' },
    { axis: 'a', label: 'A' },
    { axis: 'b', label: 'B' },
  ]

  return (
    <FlowFrame
      app={props.app}
      title="Measure Y, A, and B"
      onBack={props.app.back}
      onNext={() => props.app.setStep('quad-name')}
      nextDisabled={!allValid()}
    >
      <p>
        Repeat the same two inner/outer measurements for the remaining three beams, keeping the values
        matched to their correct axes.
      </p>
      <div class="truss-callout">
        <p>
          Use the same no-excess-force and parallel-alignment cautions as the X beam. Recheck any beam
          whose inner and outer measurements differ by more than 0.4 mm.
        </p>
      </div>

      <p class="truss-note">
        X beam already entered: outer {quad().x.outer || '—'} mm, inner {quad().x.inner || '—'} mm.
      </p>

      <For each={axes}>
        {(entry) => (
          <BeamFields
            idPrefix={`quad-${entry.axis}`}
            legend={`${entry.label} beam`}
            beam={quad()[entry.axis]}
            onChange={(patch) => props.app.updateQuadBeam(entry.axis, patch)}
          />
        )}
      </For>
    </FlowFrame>
  )
}

export function QuadName(props: { app: AppApi }) {
  const [confirmOverwrite, setConfirmOverwrite] = createSignal(false)
  const name = () => props.app.active()!.quad.printerName
  const ready = () => quadReadings(props.app.active()!.quad) !== null && name().trim() !== ''
  const duplicate = () => name().trim() !== '' && hasNameConflict(props.app.printers(), name())

  const commit = () => {
    const values = quadReadings(props.app.active()!.quad)
    if (!values) return
    const factor = calcPrinterFactor(quadAverage(values), xAverage(values[0], values[1]))
    props.app.saveQuadPrinter(name(), factor)
  }

  const next = () => {
    if (!ready()) return
    if (duplicate()) {
      setConfirmOverwrite(true)
      return
    }
    commit()
  }

  return (
    <FlowFrame app={props.app} title="Name this printer" onBack={props.app.back} onNext={next} nextDisabled={!ready()}>
      <p>
        Your measurements give this printer an extrapolation factor. Give the printer a name so the
        factor can be reused for quick Single calibrations later.
      </p>
      <p class="truss-note">
        The factor is specific to this printer, and only holds while its skew stays consistent. If you
        change the printer's skew settings later, reprint a Quad beam and recalculate it.
      </p>

      <div class="truss-field">
        <label for="quad-printer-name">Printer name</label>
        <input
          id="quad-printer-name"
          type="text"
          autocomplete="off"
          value={name()}
          aria-describedby={
            [duplicate() ? 'quad-printer-name-warning' : '', name().trim() === '' ? 'quad-printer-name-error' : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          onInput={(event) => props.app.updateQuad({ printerName: event.currentTarget.value })}
        />
        {name().trim() === '' && (
          <p id="quad-printer-name-error" class="truss-error" role="alert">
            Enter a printer name.
          </p>
        )}
        {duplicate() && (
          <p id="quad-printer-name-warning" class="truss-warning" role="status">
            A printer named “{name().trim()}” already exists. Continuing will overwrite its saved
            factor.
          </p>
        )}
      </div>

      <Show when={confirmOverwrite()}>
        <ConfirmDialog
          title="Overwrite saved printer?"
          message={`“${name().trim()}” already exists. Continuing overwrites its old extrapolation factor with this new one. Only do this when recalibrating that printer.`}
          confirmLabel="Overwrite and continue"
          onConfirm={() => {
            setConfirmOverwrite(false)
            commit()
          }}
          onCancel={() => setConfirmOverwrite(false)}
        />
      </Show>
    </FlowFrame>
  )
}

export function QuadResult(props: { app: AppApi }) {
  const quad = () => props.app.active()!.quad
  const values = () => quadReadings(quad()) ?? []
  const shrinkage = () => calcQuadShrinkage(quadAverage(values()))
  const factor = () => calcPrinterFactor(quadAverage(values()), xAverage(values()[0], values()[1]))

  const currentParsed = () => parsePositiveDecimal(quad().currentXY)
  const currentValid = () => currentParsed() !== null
  const recommended = () => {
    const current = currentParsed()
    return current === null ? null : calcRecommendedXYPercent(current, shrinkage())
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
      title="Quad calibration result"
      onNext={props.app.finish}
      nextLabel="Finish"
      nextClass="truss-button-secondary"
      nextDisabled={!currentValid()}
    >
      <p>
        Filament XY shrinkage value for this print: <strong>{formatShrinkage(shrinkage())}</strong>
      </p>

      <Show when={props.app.active()!.quadSaveFailed}>
        <div class="truss-callout truss-callout-warning">
          <h3>Printer factor could not be saved</h3>
          <p>
            Your browser storage is unavailable, so this printer's extrapolation factor was not saved.
            Note it down manually so you can add it in Manage printers later:
          </p>
          <p class="truss-factor">
            <strong>{String(factor())}</strong>
          </p>
        </div>
      </Show>

      <div class="truss-field">
        <label for="quad-current-xy">Current XY shrinkage percentage in your slicer (%)</label>
        <input
          id="quad-current-xy"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          value={quad().currentXY}
          aria-describedby={
            [percentWarning() ? 'quad-current-xy-warning' : '', !currentValid() ? 'quad-current-xy-error' : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          onInput={(event) => props.app.updateQuad({ currentXY: event.currentTarget.value })}
        />
        {percentWarning() && (
          <p id="quad-current-xy-warning" class="truss-warning" role="status">
            {percentWarning()}
          </p>
        )}
        {!currentValid() && (
          <p id="quad-current-xy-error" class="truss-error" role="alert">
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
