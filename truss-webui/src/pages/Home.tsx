import type { AppApi } from '../lib/app-api.ts'
import { Icon } from '../components/Icon.tsx'
import { icons } from '../lib/icons.ts'

export function Home(props: { app: AppApi }) {
  const hasPrinters = () => props.app.printers().length > 0

  return (
    <main class="container truss-home">
      <h1 class="text-center">Truss Calibrator</h1>
      <p class="text-center">
        Rapid, accurate calibration for filament XY shrinkage which minimizes wasted time and filament.
      </p>

      <div class="truss-card-list">
        <button type="button" class="truss-card" onClick={props.app.startQuad}>
          <span class="truss-card-content">
            <span class="truss-card-title">Quad-Beam Calibration</span>
            <span class="truss-card-body">
              Runs a full calibration. <br/>
              Start here if using Truss Calibrator for the first time on the printer being used.
            </span>
          </span>
          <span class="truss-card-action">
            <span class="truss-card-action-label">Start full calibration</span>
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
            <span class="truss-card-title">Single-Beam Calibration</span>
            <span class="truss-card-body">
              Runs a rapid calibration. <br/>
              Use this if you've already run a quad-beam calibration on the printer you will be using.
            </span>
            {!hasPrinters() && (
              <span class="truss-card-note">
                A saved printer is required - run a quad-beam calibration first, or import a printer
                from the manage printers menu.
              </span>
            )}
          </span>
          <span class="truss-card-action">
            <span class="truss-card-action-label">Start rapid calibration</span>
            <span class="truss-card-arrow" aria-hidden="true">
              →
            </span>
          </span>
        </button>

        <button type="button" class="truss-card" onClick={props.app.openPrinters}>
          <span class="truss-card-content">
            <span class="truss-card-title">Manage printers</span>
            <span class="truss-card-body">
              Edit and import/export saved printer profiles.
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

      <div class="truss-home-links">
        <a
          class="truss-icon-button"
          href="https://github.com/ai03-2725/truss-3dp-shrinkage-util"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View the source on GitHub"
          title="GitHub repository"
        >
          <Icon svg={icons.githubLogoLight} />
        </a>
        <a
          class="truss-icon-button"
          href="https://ai03.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="ai03.com"
          title="ai03.com"
        >
          <Icon svg={icons.houseLineLight} />
        </a>
      </div>
    </main>
  )
}
