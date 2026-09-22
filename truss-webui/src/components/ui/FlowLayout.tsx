import { type Component, type JSX, Show } from 'solid-js'
import { Button } from './Button'
import { StepIndicator } from './StepIndicator'

export interface FlowLayoutProps {
  current: number
  total: number
  printerName?: string
  onBack?: () => void
  onExit?: () => void
  onContinue?: () => void
  continueDisabled?: boolean
  continueLabel?: string
  onFinish?: () => void
  finishLabel?: string
  children: JSX.Element
}

/**
 * Shared flow chrome: step indicator, printer context header, and Back/Exit/
 * Continue/Finish controls (PRD §9, §17). Content is supplied by each screen.
 */
export const FlowLayout: Component<FlowLayoutProps> = (props) => (
  <div class="truss-flow">
    <StepIndicator current={props.current} total={props.total} />
    <Show when={props.printerName || props.onExit}>
      <div class="truss-flow__header">
        <p class="truss-flow__context">
          <Show when={props.printerName}>
            Calibrating on {props.printerName}
          </Show>
        </p>
        <Show when={props.onExit}>
          <Button
            variant="secondary"
            class="truss-flow__exit"
            onClick={props.onExit}
          >
            Exit
          </Button>
        </Show>
      </div>
    </Show>

    <div class="truss-flow__content">{props.children}</div>

    <div class="truss-flow__footer">
      <Show when={props.onBack}>
        <Button variant="secondary" onClick={props.onBack}>
          Back
        </Button>
      </Show>
      <span class="truss-flow__spacer" />
      <Show when={props.onContinue}>
        <Button disabled={props.continueDisabled} onClick={props.onContinue}>
          {props.continueLabel ?? 'Continue'}
        </Button>
      </Show>
      <Show when={props.onFinish}>
        <Button onClick={props.onFinish}>
          {props.finishLabel ?? 'Finish'}
        </Button>
      </Show>
    </div>
  </div>
)
