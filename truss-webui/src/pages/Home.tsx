import type { AppStore } from '../lib/appState'

const GITHUB_URL = 'https://github.com/ai03-2725/truss-3dp-shrinkage-util'
const DOCS_URL =
  'https://github.com/ai03-2725/truss-3dp-shrinkage-util/tree/main/Documentation'

export default function Home(props: { app: AppStore }) {
  const startQuad = () => {
    props.app.resetMeasurements()
    props.app.go(props.app.prefs().skipPrerequisiteCheck ? 'q2' : 'q1')
  }

  const startSingle = () => {
    props.app.resetMeasurements()
    props.app.go('s1')
  }

  return (
    <div class="truss-home">
      <h1 class="truss-home-title">Truss Shrinkage Calibrator</h1>
      <p class="truss-home-sub">
        Guides you through the 3D-printed Truss calibration and calculates the
        filament XY shrinkage value for your slicer.
      </p>

      <div class="truss-options">
        <button type="button" class="truss-option" onClick={startQuad}>
          <span class="truss-option-title">Quad-Beam Calibration</span>
          <span class="truss-option-sub">
            {
              "Runs a full calibration.\nStart here if you've never used Truss Calibrator on the printer you will be using."
            }
          </span>
        </button>

        <button
          type="button"
          class="truss-option"
          onClick={startSingle}
          disabled={props.app.printers().length === 0}
        >
          <span class="truss-option-title">Single-Beam Calibration</span>
          <span class="truss-option-sub">
            {
              "Runs a rapid calibration.\nUse this if you've already run the quad-beam calibration on the printer you will be using."
            }
          </span>
        </button>

        {props.app.printers().length === 0 && (
          <p class="truss-warning">
            No saved printers available - Run a quad-beam calibration first or
            import printers manually.
          </p>
        )}
      </div>

      <div class="truss-home-manage">
        <button
          type="button"
          class="truss-btn truss-btn-secondary"
          onClick={() => props.app.go('managePrinters')}
        >
          Manage saved printers
        </button>
      </div>

      <div class="truss-home-links">
        <a
          class="truss-icon-link"
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
        >
          <svg role="presentation" aria-hidden="true">
            <use href="/icons.svg#github-icon" />
          </svg>
          GitHub
        </a>
        <a
          class="truss-icon-link"
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
        >
          <svg role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon" />
          </svg>
          Documentation
        </a>
      </div>
    </div>
  )
}
