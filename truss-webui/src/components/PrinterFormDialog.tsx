import { createSignal, onCleanup, onMount } from 'solid-js'
import type { PrinterError } from '../lib/printers.ts'
import { isFactorOutOfRange, parsePositiveDecimal } from '../lib/calc.ts'
import { useLocale } from '../lib/locale-context.ts'
import { messages, printerErrorMessage } from '../lib/messages.ts'

// Shared add/edit printer form. Labels come from locale messages; the error is a
// stable identifier so it re-renders when the locale changes.
export function PrinterFormDialog(props: {
  title: string
  initialName: string
  initialFactor: string
  onSubmit: (name: string, factor: string) => PrinterError | null
  onClose: () => void
}) {
  const [name, setName] = createSignal(props.initialName)
  const [factor, setFactor] = createSignal(props.initialFactor)
  const [error, setError] = createSignal<PrinterError | null>(null)
  const locale = useLocale()
  const t = () => messages(locale())
  let ref!: HTMLDialogElement
  let trigger: Element | null = null
  onMount(() => {
    trigger = document.activeElement
    ref.showModal()
  })
  onCleanup(() => {
    if (trigger instanceof HTMLElement) trigger.focus()
  })

  const factorWarning = () => {
    const parsed = parsePositiveDecimal(factor())
    return parsed !== null && isFactorOutOfRange(parsed) ? t().factorRangeWarning : null
  }

  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    const message = props.onSubmit(name(), factor())
    if (message) setError(message)
  }

  return (
    <dialog
      ref={ref}
      class="truss-modal"
      aria-labelledby="truss-printer-form-title"
      onCancel={(event) => {
        event.preventDefault()
        props.onClose()
      }}
    >
      <form onSubmit={submit} novalidate>
        <h2 id="truss-printer-form-title">{props.title}</h2>
        {error() && (
          <p class="truss-error" role="alert">
            {printerErrorMessage(locale(), error()!)}
          </p>
        )}

        <div class="truss-field">
          <label for="truss-printer-name">{t().printerNameLabel}</label>
          <input
            id="truss-printer-name"
            type="text"
            autocomplete="off"
            value={name()}
            onInput={(event) => setName(event.currentTarget.value)}
          />
        </div>

        <div class="truss-field">
          <label for="truss-printer-factor">{t().extrapolationFactorLabel}</label>
          <input
            id="truss-printer-factor"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            value={factor()}
            aria-describedby={factorWarning() ? 'truss-printer-factor-warning' : undefined}
            onInput={(event) => setFactor(event.currentTarget.value)}
          />
          {factorWarning() && (
            <p id="truss-printer-factor-warning" class="truss-warning" role="status">
              {factorWarning()}
            </p>
          )}
        </div>

        <div class="truss-modal-actions">
          <button type="button" class="truss-button-secondary" onClick={props.onClose}>
            {t().cancel}
          </button>
          <button type="submit">{t().save}</button>
        </div>
      </form>
    </dialog>
  )
}
