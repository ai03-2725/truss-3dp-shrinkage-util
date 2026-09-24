import type { AppApi } from '../lib/app-api.ts'

export function Home(props: { app: AppApi }) {
  const hasPrinters = () => props.app.printers().length > 0

  return (
    <main class="container truss-home">
      <h1 class="text-center">Truss Calibrator</h1>
      <p class="text-center">
        Measure a calibration beam to get your filament's XY shrinkage and the percentage to enter in
        your slicer.
      </p>

      <div class="truss-card-list">
        <button type="button" class="truss-card" onClick={props.app.startQuad}>
          <span class="truss-card-content">
            <span class="truss-card-title">Quad calibration (Full)</span>
            <span class="truss-card-body">
              For a printer's first calibration. Measures all four beams and saves this printer's
              extrapolation factor so later calibrations can be quick.
            </span>
          </span>
          <span class="truss-card-action">
            <span class="truss-card-action-label">Start Quad calibration</span>
            <span class="truss-card-arrow" aria-hidden="true">
              →
            </span>
          </span>
        </button>

        <button
          type="button"
          class="truss-card"
          onClick={props.app.startSingle}
          disabled={!hasPrinters()}
        >
          <span class="truss-card-content">
            <span class="truss-card-title">Single calibration (Quick)</span>
            <span class="truss-card-body">
              For a printer you have already calibrated. Prints one beam and reuses its saved
              extrapolation factor.
            </span>
            {!hasPrinters() && (
              <span class="truss-card-note">
                A saved printer is required. Run a Quad calibration first, or add or import a printer
                from Manage printers.
              </span>
            )}
          </span>
          <span class="truss-card-action">
            <span class="truss-card-action-label">Start Single calibration</span>
            <span class="truss-card-arrow" aria-hidden="true">
              →
            </span>
          </span>
        </button>

        <button type="button" class="truss-card" onClick={props.app.openPrinters}>
          <span class="truss-card-content">
            <span class="truss-card-title">Manage printers</span>
            <span class="truss-card-body">
              Edit, delete, add, import, and export saved printer profiles.
            </span>
          </span>
          <span class="truss-card-action">
            <span class="truss-card-action-label">Manage printers</span>
            <span class="truss-card-arrow" aria-hidden="true">
              →
            </span>
          </span>
        </button>
      </div>
    </main>
  )
}
