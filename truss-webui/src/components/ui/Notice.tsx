import type { Component, JSX } from 'solid-js'

export interface NoticeProps {
  kind?: 'info' | 'warning'
  children: JSX.Element
}

/** Non-blocking info/warning banner (PRD §15, §17). */
export const Notice: Component<NoticeProps> = (props) => (
  <p
    class={`truss-notice truss-notice--${props.kind ?? 'info'}`}
    role={props.kind === 'warning' ? 'alert' : 'status'}
  >
    {props.children}
  </p>
)
