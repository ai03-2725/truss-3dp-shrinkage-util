import type { Component } from 'solid-js'

export interface StepIndicatorProps {
  /** 1-based current step. */
  current: number
  total: number
}

/** "Step N of M" text plus a progress bar (PRD §17). */
export const StepIndicator: Component<StepIndicatorProps> = (props) => {
  const percent = () =>
    props.total > 0 ? Math.min(100, (props.current / props.total) * 100) : 0
  return (
    <div class="truss-steps">
      <p class="truss-steps__label">
        Step {props.current} of {props.total}
      </p>
      <div
        class="truss-steps__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={props.total}
        aria-valuenow={props.current}
        aria-label={`Step ${props.current} of ${props.total}`}
      >
        <div class="truss-steps__fill" style={{ width: `${percent()}%` }} />
      </div>
    </div>
  )
}
