import {
  createEffect,
  createSignal,
  For,
  type JSX,
  onCleanup,
  Show,
} from 'solid-js'

/* ------------------------------------------------------------------ Button */

export interface ButtonProps {
  children: JSX.Element
  onClick?: (event: MouseEvent) => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  class?: string
  'aria-label'?: string
}

export function Button(props: ButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      class={`truss-btn ${props.variant === 'secondary' ? 'truss-btn-secondary' : ''} ${props.class ?? ''}`}
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props['aria-label']}
    >
      {props.children}
    </button>
  )
}

/* ------------------------------------------------------------- Text fields */

interface FieldProps {
  id: string
  label: string
  value: string
  onInput: (value: string) => void
  placeholder?: string
  type?: 'text' | 'number'
  inputmode?: 'text' | 'decimal'
  suffix?: string
  warning?: string
  error?: string
  autocomplete?: string
}

export function TextField(props: FieldProps) {
  const hintId = () => `${props.id}-hint`
  return (
    <div class="truss-field">
      <label for={props.id}>{props.label}</label>
      <div class="truss-input-wrap">
        <input
          id={props.id}
          type={props.type ?? 'text'}
          inputmode={props.inputmode}
          value={props.value}
          placeholder={props.placeholder}
          autocomplete={props.autocomplete}
          aria-invalid={props.error ? 'true' : undefined}
          aria-describedby={props.error || props.warning ? hintId() : undefined}
          onInput={(event) => props.onInput(event.currentTarget.value)}
        />
        <Show when={props.suffix}>
          <span class="truss-suffix">{props.suffix}</span>
        </Show>
      </div>
      <Show when={props.error}>
        <p id={hintId()} class="truss-error" role="alert">
          {props.error}
        </p>
      </Show>
      <Show when={props.warning && !props.error}>
        <p id={hintId()} class="truss-warning">
          {props.warning}
        </p>
      </Show>
    </div>
  )
}

export function NumberField(props: Omit<FieldProps, 'type' | 'inputmode'>) {
  return <TextField {...props} type="number" inputmode="decimal" />
}

/* -------------------------------------------------------------- Checkboxes */

export interface CheckboxProps {
  id: string
  label: JSX.Element
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Checkbox(props: CheckboxProps) {
  return (
    <label class="truss-checkbox" for={props.id}>
      <input
        id={props.id}
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
      <span>{props.label}</span>
    </label>
  )
}

/* ------------------------------------------------------------------- Modal */

export interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: JSX.Element
}

/**
 * Native <dialog> gives us focus trapping, Esc-to-close and an inert backdrop
 * for free — no custom focus-trap code. PRD §17.
 */
export function Modal(props: ModalProps) {
  let dialog: HTMLDialogElement | undefined

  createEffect(() => {
    if (!dialog) return
    if (props.open && !dialog.open) dialog.showModal()
    if (!props.open && dialog.open) dialog.close()
  })

  return (
    <dialog
      ref={dialog}
      class="truss-modal"
      aria-label={props.title}
      onCancel={(event) => {
        event.preventDefault()
        props.onClose()
      }}
      onClick={(event) => {
        if (event.target === dialog) props.onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') props.onClose()
      }}
    >
      <div class="truss-modal-body">
        <h2 class="truss-modal-title">{props.title}</h2>
        {props.children}
      </div>
    </dialog>
  )
}

/* ------------------------------------------------------------ StepIndicator */

export function StepIndicator(props: { current: number; total: number }) {
  const percent = () =>
    props.total <= 0 ? 0 : (props.current / props.total) * 100
  return (
    <div class="truss-step">
      <p class="truss-step-label">
        Step {props.current} of {props.total}
      </p>
      <div
        class="truss-progress"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(percent())}
      >
        <div class="truss-progress-fill" style={{ width: `${percent()}%` }} />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Lightbox */

export function Lightbox(props: {
  src: string
  alt: string
  onClose: () => void
}) {
  let dialog: HTMLDialogElement | undefined

  createEffect(() => {
    if (dialog && !dialog.open) dialog.showModal()
  })

  return (
    <dialog
      ref={dialog}
      class="truss-lightbox"
      aria-label={props.alt}
      onCancel={(event) => {
        event.preventDefault()
        props.onClose()
      }}
      onClick={() => props.onClose()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') props.onClose()
      }}
    >
      <img src={props.src} alt={props.alt} />
    </dialog>
  )
}

/* ---------------------------------------------------------------- CopyButton */

export function CopyButton(props: { text: string; label?: string }) {
  const [copied, setCopied] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  onCleanup(() => {
    if (timer) clearTimeout(timer)
  })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.text)
      setCopied(true)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable; leave the value visible for manual copy.
    }
  }

  return (
    <Button variant="secondary" onClick={copy} class="truss-copy">
      {copied() ? 'Copied' : (props.label ?? 'Copy')}
    </Button>
  )
}

/* ------------------------------------------------------------------ Notices */

export function Notice(props: {
  variant?: 'info' | 'warning'
  children: JSX.Element
}) {
  return (
    <p
      class={`truss-notice truss-notice-${props.variant ?? 'info'}`}
      role="status"
    >
      {props.children}
    </p>
  )
}

export function WarningText(props: { children: JSX.Element }) {
  return <p class="truss-warning">{props.children}</p>
}

/* ------------------------------------------------------------- Image figure */

export function ZoomImage(props: {
  src: string
  alt: string
  onZoom: (src: string, alt: string) => void
}) {
  return (
    <button
      type="button"
      class="truss-image-btn"
      onClick={() => props.onZoom(props.src, props.alt)}
    >
      <img src={props.src} alt={props.alt} loading="lazy" />
    </button>
  )
}

/** Convenience wrapper used by flow screens that keep a lightbox signal. */
export function ImageList(props: {
  items: Array<{ src: string; alt: string }>
  onZoom: (src: string, alt: string) => void
}) {
  return (
    <div class="truss-images">
      <For each={props.items}>
        {(item) => (
          <ZoomImage src={item.src} alt={item.alt} onZoom={props.onZoom} />
        )}
      </For>
    </div>
  )
}

/** An image grid that owns its own tap-to-zoom lightbox. PRD §16. */
export function ImageGrid(props: {
  items: Array<{ src: string; alt: string }>
}) {
  const [zoom, setZoom] = createSignal<{ src: string; alt: string } | null>(
    null,
  )
  return (
    <>
      <ImageList
        items={props.items}
        onZoom={(src, alt) => setZoom({ src, alt })}
      />
      <Show when={zoom()}>
        {(current) => (
          <Lightbox
            src={current().src}
            alt={current().alt}
            onClose={() => setZoom(null)}
          />
        )}
      </Show>
    </>
  )
}
