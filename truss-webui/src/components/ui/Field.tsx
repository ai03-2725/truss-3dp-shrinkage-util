import type { Component } from 'solid-js'
import { Show } from 'solid-js'

export interface FieldProps {
  id: string
  label: string
  value: string
  onInput: (value: string) => void
  unit?: string
  placeholder?: string
  warning?: string
  error?: string
  autofocus?: boolean
}

/** Shared label + input + inline message markup. */
const FieldBase: Component<
  FieldProps & {
    type: 'text' | 'number'
    step?: string
    min?: string
    max?: string
  }
> = (props) => (
  <div class="truss-field">
    <label for={props.id}>{props.label}</label>
    <div class="truss-field__row">
      <input
        id={props.id}
        type={props.type}
        inputmode={props.type === 'number' ? 'decimal' : undefined}
        step={props.step}
        min={props.min}
        max={props.max}
        value={props.value}
        placeholder={props.placeholder}
        autofocus={props.autofocus}
        onInput={(event) => props.onInput(event.currentTarget.value)}
      />
      <Show when={props.unit}>
        <span class="truss-field__unit">{props.unit}</span>
      </Show>
    </div>
    <Show when={props.error}>
      <p class="truss-field__error">{props.error}</p>
    </Show>
    <Show when={props.warning}>
      <p class="truss-field__warning">{props.warning}</p>
    </Show>
  </div>
)

/** Single-line text input with label and inline feedback. */
export const TextField: Component<FieldProps> = (props) => (
  <FieldBase {...props} type="text" />
)

/** Numeric input (decimal keypad) with label and inline feedback. */
export const NumberField: Component<FieldProps> = (props) => (
  <FieldBase {...props} type="number" step="any" />
)
