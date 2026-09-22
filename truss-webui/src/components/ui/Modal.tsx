import {
  type Component,
  createEffect,
  createUniqueId,
  type JSX,
  onCleanup,
} from 'solid-js'

export interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: JSX.Element
}

/**
 * Accessible modal built on the native `<dialog>` element, so focus trapping,
 * Esc-to-close and `aria-modal` come from the platform (PRD §17).
 */
export const Modal: Component<ModalProps> = (props) => {
  let dialog: HTMLDialogElement | undefined
  let previouslyFocused: HTMLElement | null = null
  const titleId = createUniqueId()

  createEffect(() => {
    if (!dialog) return
    if (props.open && !dialog.open) {
      previouslyFocused = document.activeElement as HTMLElement | null
      dialog.showModal()
    } else if (!props.open && dialog.open) {
      dialog.close()
    }
  })

  onCleanup(() => {
    if (dialog?.open) dialog.close()
  })

  const handleClose = () => {
    props.onClose()
    previouslyFocused?.focus()
  }

  return (
    <dialog
      ref={dialog}
      class="truss-modal"
      aria-labelledby={titleId}
      onClose={handleClose}
      onCancel={(event) => {
        event.preventDefault()
        props.onClose()
      }}
      onClick={(event) => {
        if (event.target === dialog) props.onClose()
      }}
    >
      <div class="truss-modal__panel">
        <h2 id={titleId} class="truss-modal__title">
          {props.title}
        </h2>
        {props.children}
      </div>
    </dialog>
  )
}
