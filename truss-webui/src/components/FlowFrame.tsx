import { Show, type JSX } from 'solid-js'
import type { AppApi } from '../lib/app-api.ts'
import { flowProgress } from '../lib/flow.ts'
import { Icon } from './Icon.tsx'
import { icons } from '../lib/icons.ts'

// Consistent step chrome: Exit is always available, Back only before results,
// and a single primary action gated by each screen.
export function FlowFrame(props: {
  app: AppApi
  title: string
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  nextClass?: string
  children: JSX.Element
}) {
  const progress = () => flowProgress(props.app.screen(), props.app.skipEquipment())

  return (
    <main class="container truss-flow" aria-labelledby="truss-step-title">
      <div class="truss-flow-topbar">
        <Show when={progress()}>
          {(value) => (
            <div class="truss-progress">
              <span class="truss-progress-label">
                Step {value().current} of {value().total}
              </span>
              <div
                class="truss-progress-track"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={value().total}
                aria-valuenow={value().current}
                aria-label="Calibration progress"
              >
                <div
                  class="truss-progress-fill"
                  style={{ width: `${(value().current / value().total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </Show>
        <button
          type="button"
          class="truss-icon-button"
          aria-label="Exit calibration"
          onClick={props.app.requestExit}
        >
          <Icon svg={icons.x} />
        </button>
      </div>
      <h1 id="truss-step-title" class="truss-step-title">
        {props.title}
      </h1>
      <div class="truss-step-body">{props.children}</div>
      <div class="truss-step-actions">
        {props.onBack && (
          <button type="button" class="truss-button-secondary" onClick={props.onBack}>
            Back
          </button>
        )}
        {props.onNext && (
          <button
            type="button"
            class={['truss-step-next', props.nextClass].filter(Boolean).join(' ')}
            onClick={props.onNext}
            disabled={props.nextDisabled}
          >
            {props.nextLabel ?? 'Next'}
          </button>
        )}
      </div>
    </main>
  )
}
