import { Show, onCleanup, onMount, type JSX } from 'solid-js'

// Native <dialog> keeps focus trapping and Escape handling in the platform; we
// only add Back/named buttons so keyboard and screen-reader use come for free.
export function ConfirmDialog(props: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  children?: JSX.Element
}) {
  let ref!: HTMLDialogElement
  let trigger: Element | null = null
  onMount(() => {
    trigger = document.activeElement
    ref.showModal()
  })
  // Return focus to the control that opened the dialog even though Solid unmounts it.
  onCleanup(() => {
    if (trigger instanceof HTMLElement) trigger.focus()
  })

  return (
    <dialog
      ref={ref}
      class="truss-modal"
      aria-labelledby="truss-modal-title"
      onCancel={(event) => {
        event.preventDefault()
        props.onCancel()
      }}
    >
      <h2 id="truss-modal-title">{props.title}</h2>
      <p>{props.message}</p>
      <Show when={props.children}>{props.children}</Show>
      <div class="truss-modal-actions">
        <button type="button" class="truss-button-secondary" onClick={props.onCancel}>
          Cancel
        </button>
        <button type="button" onClick={props.onConfirm}>
          {props.confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
