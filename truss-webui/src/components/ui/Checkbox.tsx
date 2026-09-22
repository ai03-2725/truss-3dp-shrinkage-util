import type { Component } from 'solid-js'

export interface CheckboxProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

/** Checkbox with label association and required/disabled behavior. */
export const Checkbox: Component<CheckboxProps> = (props) => (
  <div class="truss-checkbox">
    <input
      id={props.id}
      type="checkbox"
      checked={props.checked}
      disabled={props.disabled}
      onChange={(event) => props.onChange(event.currentTarget.checked)}
    />
    <label for={props.id}>{props.label}</label>
  </div>
)
