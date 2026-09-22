import { type Component, createEffect } from 'solid-js'

export interface LightboxProps {
  src: string | null
  alt: string
  onClose: () => void
}

/** Tap-to-zoom image viewer; keyboard close is native to `<dialog>`. */
export const Lightbox: Component<LightboxProps> = (props) => {
  let dialog: HTMLDialogElement | undefined

  createEffect(() => {
    if (!dialog) return
    if (props.src && !dialog.open) dialog.showModal()
    else if (!props.src && dialog.open) dialog.close()
  })

  return (
    <dialog
      ref={dialog}
      class="truss-lightbox"
      aria-label="Enlarged image"
      onClose={() => props.onClose()}
      onCancel={(event) => {
        event.preventDefault()
        props.onClose()
      }}
      onClick={(event) => {
        if (event.target === dialog) props.onClose()
      }}
    >
      <button
        type="button"
        class="truss-lightbox__close"
        aria-label="Close enlarged image"
        onClick={() => props.onClose()}
      >
        ×
      </button>
      <img
        class="truss-lightbox__image"
        src={props.src ?? ''}
        alt={props.alt}
      />
    </dialog>
  )
}
