import type { Component } from 'solid-js'
import { DOCS_URL, GITHUB_URL } from '../lib/constants'

export interface HomeProps {
  printerCount: number
  onStartQuad: () => void
  onStartSingle: () => void
  onManagePrinters: () => void
}

/** Home is the flow chooser and navigation hub (PRD §11). */
export const Home: Component<HomeProps> = (props) => (
  <div class="truss-page truss-home">
    <h1 class="truss-page__title">Truss Shrinkage Calibrator</h1>
    <p class="truss-page__lede">
      Measure a printed Truss beam and get the exact XY shrinkage value to enter
      into your slicer, with all the math done for you.
    </p>

    <div class="truss-home__options">
      <button
        type="button"
        class="truss-option-card"
        onClick={() => props.onStartQuad()}
      >
        <p class="truss-option-card__name">Quad-Beam Calibration</p>
        <p class="truss-option-card__desc">
          {
            "Runs a full calibration.\nStart here if you've never used Truss Calibrator on the printer you will be using."
          }
        </p>
      </button>

      <button
        type="button"
        class="truss-option-card"
        disabled={props.printerCount === 0}
        onClick={() => props.onStartSingle()}
      >
        <p class="truss-option-card__name">Single-Beam Calibration</p>
        <p class="truss-option-card__desc">
          {
            "Runs a rapid calibration.\nUse this if you've already run the quad-beam calibration on the printer you will be using."
          }
        </p>
        {props.printerCount === 0 && (
          <p class="truss-option-card__note">
            No saved printers available - Run a quad-beam calibration first or
            import printers manually.
          </p>
        )}
      </button>
    </div>

    <button
      type="button"
      class="truss-button truss-button--secondary"
      onClick={() => props.onManagePrinters()}
    >
      Manage saved printers
    </button>

    <div class="truss-home__footer">
      <a
        class="truss-icon-link"
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Open the GitHub repository"
      >
        <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.82 1.23.82.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"
          />
        </svg>
        <span class="truss-visually-hidden">GitHub repository</span>
      </a>
      <a
        class="truss-icon-link"
        href={DOCS_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Open the documentation"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M4 4h7a2 2 0 0 1 2 2v14a3 3 0 0 0-3-3H4V4Zm16 0h-5a2 2 0 0 0-2 2v14a3 3 0 0 1 3-3h4V4Z"
          />
        </svg>
        <span class="truss-visually-hidden">Documentation</span>
      </a>
    </div>
  </div>
)
