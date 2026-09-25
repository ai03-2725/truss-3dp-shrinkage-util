import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import type { AppApi } from '../lib/app-api.ts'
import { addPrinter, deletePrinter, editPrinter, exportJSON, importJSON } from '../lib/printers.ts'
import { isFactorOutOfRange, parsePositiveDecimal } from '../lib/calc.ts'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { Icon } from '../components/Icon.tsx'
import { icons } from '../lib/icons.ts'

function PrinterFormDialog(props: {
  title: string
  initialName: string
  initialFactor: string
  onSubmit: (name: string, factor: string) => string | null
  onClose: () => void
}) {
  const [name, setName] = createSignal(props.initialName)
  const [factor, setFactor] = createSignal(props.initialFactor)
  const [error, setError] = createSignal<string | null>(null)
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
    return parsed !== null && isFactorOutOfRange(parsed)
      ? 'This factor is outside the usual 0.9–1.1 range. Double-check it before saving.'
      : null
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
            {error()}
          </p>
        )}

        <div class="truss-field">
          <label for="truss-printer-name">Printer name</label>
          <input
            id="truss-printer-name"
            type="text"
            autocomplete="off"
            value={name()}
            onInput={(event) => setName(event.currentTarget.value)}
          />
        </div>

        <div class="truss-field">
          <label for="truss-printer-factor">Extrapolation factor</label>
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
            Cancel
          </button>
          <button type="submit">Save</button>
        </div>
      </form>
    </dialog>
  )
}

export function Printers(props: { app: AppApi }) {
  const [editingIndex, setEditingIndex] = createSignal<number | null>(null)
  const [adding, setAdding] = createSignal(false)
  const [deletingIndex, setDeletingIndex] = createSignal<number | null>(null)
  const [importError, setImportError] = createSignal<string | null>(null)
  const [importSkipped, setImportSkipped] = createSignal<string[]>([])
  let fileInput!: HTMLInputElement

  const downloadExport = () => {
    const blob = new Blob([exportJSON(props.app.printers())], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'truss-printers.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File | undefined) => {
    setImportError(null)
    setImportSkipped([])
    if (!file) return
    const result = importJSON(props.app.printers(), await file.text())
    if (!result.ok) {
      setImportError(result.error)
      return
    }
    props.app.replacePrinters(result.printers)
    setImportSkipped(result.skipped)
    if (fileInput) fileInput.value = ''
  }

  return (
    <main class="container truss-printers">
      <div class="truss-flow-topbar">
        <button
          type="button"
          class="truss-icon-button"
          aria-label="Home"
          onClick={() => props.app.finish()}
        >
          <Icon svg={icons.house} />
        </button>
      </div>

      <h1>Manage printers</h1>
      <p>
        Printer profiles are kept only in this browser; export them to move or back them up.
      </p>

      <Show
        when={props.app.printers().length > 0}
        fallback={<p class="truss-note">No printers saved yet. Add one below or run a Quad calibration.</p>}
      >
        <table class="truss-printer-table">
          <caption class="truss-visually-hidden">Saved printer profiles</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Extrapolation factor</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.app.printers()}>
              {(printer, index) => (
                <tr>
                  <td data-label="Name">{printer.name}</td>
                  <td data-label="Factor">{String(printer.extrapolationFactor)}</td>
                  <td data-label="Actions" class="truss-row-actions">
                    <button
                      type="button"
                      class="truss-button-secondary"
                      onClick={() => setEditingIndex(index())}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      class="truss-button-secondary"
                      onClick={() => setDeletingIndex(index())}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>

      <div class="truss-printer-toolbar">
        <button type="button" onClick={() => setAdding(true)}>
          Add printer
        </button>
        <button type="button" class="truss-button-secondary" onClick={downloadExport}>
          Export JSON
        </button>
        <button type="button" class="truss-button-secondary" onClick={() => fileInput.click()}>
          Import JSON
        </button>
        <input
          ref={fileInput}
          class="truss-visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label="Import printer profiles from a JSON file"
          onChange={(event) => handleImport(event.currentTarget.files?.[0])}
        />
      </div>

      {importError() && (
        <p class="truss-error" role="alert">
          Import failed: {importError()}
        </p>
      )}
      {importSkipped().length > 0 && (
        <p class="truss-warning" role="status">
          Imported, but kept your saved profiles for {importSkipped().length} name
          {importSkipped().length === 1 ? '' : 's'} already present: {importSkipped().join(', ')}.
        </p>
      )}

      <section class="truss-preference" aria-labelledby="truss-preference-title">
        <h2 id="truss-preference-title">Calibration setup</h2>
        <label class="truss-checkbox">
          <input
            type="checkbox"
            checked={props.app.skipEquipment()}
            onChange={(event) => props.app.setSkipEquipment(event.currentTarget.checked)}
          />
          Skip the equipment prerequisites screen on future Quad calibrations
        </label>
      </section>

      <Show when={adding()}>
        <PrinterFormDialog
          title="Add printer"
          initialName=""
          initialFactor=""
          onClose={() => setAdding(false)}
          onSubmit={(name, factor) => {
            const result = addPrinter(props.app.printers(), name, factor)
            if (!result.ok) return result.error
            props.app.replacePrinters(result.printers)
            setAdding(false)
            return null
          }}
        />
      </Show>

      <Show when={editingIndex() !== null}>
        <PrinterFormDialog
          title="Edit printer"
          initialName={props.app.printers()[editingIndex()!].name}
          initialFactor={String(props.app.printers()[editingIndex()!].extrapolationFactor)}
          onClose={() => setEditingIndex(null)}
          onSubmit={(name, factor) => {
            const index = editingIndex()
            if (index === null) return null
            const result = editPrinter(props.app.printers(), index, name, factor)
            if (!result.ok) return result.error
            props.app.replacePrinters(result.printers)
            setEditingIndex(null)
            return null
          }}
        />
      </Show>

      <Show when={deletingIndex() !== null}>
        <ConfirmDialog
          title="Delete printer?"
          message={`Delete “${props.app.printers()[deletingIndex()!].name}”? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            const index = deletingIndex()
            if (index === null) return
            props.app.replacePrinters(deletePrinter(props.app.printers(), index))
            setDeletingIndex(null)
          }}
          onCancel={() => setDeletingIndex(null)}
        />
      </Show>
    </main>
  )
}
