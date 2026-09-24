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
        <section class="truss-card" aria-labelledby="truss-home-quad">
          <h2 id="truss-home-quad">Quad calibration (Full)</h2>
          <p>
            For a printer's first calibration. Measures all four beams and saves this printer's
            extrapolation factor so later calibrations can be quick.
          </p>
          <button type="button" onClick={props.app.startQuad}>
            Start Quad calibration
          </button>
        </section>

        <section class="truss-card" aria-labelledby="truss-home-single">
          <h2 id="truss-home-single">Single calibration (Quick)</h2>
          <p>
            For a printer you have already calibrated. Prints one beam and reuses its saved
            extrapolation factor.
          </p>
          <button type="button" onClick={props.app.startSingle} disabled={!hasPrinters()}>
            Start Single calibration
          </button>
          {!hasPrinters() && (
            <p class="truss-note">
              A saved printer is required. Run a Quad calibration first, or add or import a printer
              from Manage printers.
            </p>
          )}
        </section>

        <section class="truss-card" aria-labelledby="truss-home-manage">
          <h2 id="truss-home-manage">Manage printers</h2>
          <p>Edit, delete, add, import, and export saved printer profiles.</p>
          <button type="button" class="truss-button-secondary" onClick={props.app.openPrinters}>
            Manage printers
          </button>
        </section>
      </div>
    </main>
  )
}
