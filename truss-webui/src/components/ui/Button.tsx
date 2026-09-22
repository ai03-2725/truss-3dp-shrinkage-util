import type { Component, JSX } from 'solid-js'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'

export interface ButtonProps {
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  variant?: ButtonVariant
  class?: string
  ariaLabel?: string
  children: JSX.Element
}

/** Minimal button primitive (PRD §17). */
export const Button: Component<ButtonProps> = (props) => (
  <button
    type={props.type ?? 'button'}
    class={`truss-button truss-button--${props.variant ?? 'primary'} ${props.class ?? ''}`}
    disabled={props.disabled}
    aria-label={props.ariaLabel}
    onClick={() => props.onClick?.()}
  >
    {props.children}
  </button>
)
