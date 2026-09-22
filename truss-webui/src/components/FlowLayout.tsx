import { type JSX, Show } from 'solid-js'
import type { AppStore } from '../lib/appState'
import type { ScreenId } from '../lib/types'
import { Button, StepIndicator } from './ui'

export interface FlowLayoutProps {
  app: AppStore
  screens: ScreenId[]
  screen: ScreenId
  title: string
  printerName?: string
  children: JSX.Element
  onContinue: () => void
  continueLabel?: string
  continueDisabled?: boolean
  /** Omit to hide the Back button (first step or a final result screen). */
  onBack?: () => void
}

/**
 * Non-content scaffolding shared by both flows: step indicator, context
 * header, Back/Continue nav and the mid-flow exit control. PRD §9, §17.
 */
export default function FlowLayout(props: FlowLayoutProps) {
  const index = () => props.screens.indexOf(props.screen)
  const total = () => props.screens.length
  const isLast = () => index() === total() - 1

  return (
    <div class="truss-flow">
      <StepIndicator current={index() + 1} total={total()} />

      <div class="truss-flow-header">
        <Show when={props.printerName}>
          <p class="truss-context">Calibrating on {props.printerName}</p>
        </Show>
        <h1 class="truss-flow-title">{props.title}</h1>
      </div>

      <div class="truss-flow-copy">{props.children}</div>

      <div class="truss-flow-nav">
        <Show when={props.onBack}>
          <Button variant="secondary" onClick={props.onBack}>
            Back
          </Button>
        </Show>
        <div class="truss-spacer" />
        <Show when={!isLast()}>
          <Button
            variant="secondary"
            onClick={() => props.app.requestExit()}
            class="truss-exit"
          >
            Exit
          </Button>
        </Show>
        <Button
          onClick={props.onContinue}
          disabled={props.continueDisabled}
          class="truss-continue"
        >
          {props.continueLabel ?? 'Continue'}
        </Button>
      </div>
    </div>
  )
}
