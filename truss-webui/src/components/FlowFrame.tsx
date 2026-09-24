import type { JSX } from 'solid-js'
import type { AppApi } from '../lib/app-api.ts'
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
  return (
    <main class="container truss-flow" aria-labelledby="truss-step-title">
      <div class="truss-flow-topbar">
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
