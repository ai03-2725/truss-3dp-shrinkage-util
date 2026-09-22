import { createMemo, createSignal, For, Show } from 'solid-js'
import { Button, Modal, Notice, TextField, WarningText } from '../components/ui'
import type { AppStore } from '../lib/appState'
import { format5dp } from '../lib/calc'
import { STORE_VERSION } from '../lib/constants'
import { parseImportedPrinters } from '../lib/storage'
import type { Printer } from '../lib/types'
import { validateFactor, validatePrinterName } from '../lib/validation'

function timestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export default function ManagePrinters(props: { app: AppStore }) {
  const [editOpen, setEditOpen] = createSignal(false)
  const [editOriginal, setEditOriginal] = createSignal<string | null>(null)
  const [editName, setEditName] = createSignal('')
  const [editFactor, setEditFactor] = createSignal('')
  const [deleting, setDeleting] = createSignal<Printer | null>(null)
  const [importError, setImportError] = createSignal<string | null>(null)
  const [importSummary, setImportSummary] = createSignal<string | null>(null)
  let fileInput: HTMLInputElement | undefined

  const sorted = createMemo(() =>
    [...props.app.printers()].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
    ),
  )

  const nameCheck = () =>
    validatePrinterName(
      editName(),
      props.app.printers().map((p) => p.name),
      editOriginal() ?? undefined,
    )

  const factorCheck = () => validateFactor(editFactor())

  const editValid = () => nameCheck().valid && factorCheck().valid

  const openAdd = () => {
    setEditOriginal(null)
    setEditName('')
    setEditFactor('')
    setEditOpen(true)
  }

  const openEdit = (printer: Printer) => {
    setEditOriginal(printer.name)
    setEditName(printer.name)
    setEditFactor(String(printer.extrapolationFactor))
    setEditOpen(true)
  }

  const saveEdit = () => {
    if (!editValid()) return
    const printer: Printer = {
      name: editName().trim(),
      extrapolationFactor: Number(editFactor()),
    }
    const original = editOriginal()
    if (original === null) props.app.addPrinter(printer)
    else props.app.updatePrinter(original, printer)
    setEditOpen(false)
  }

  const confirmDelete = () => {
    const printer = deleting()
    if (printer) props.app.deletePrinter(printer.name)
    setDeleting(null)
  }

  const exportPrinters = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { version: STORE_VERSION, printers: props.app.printers() },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `truss-printers-${timestamp()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importPrinters = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setImportSummary(null)
    setImportError(null)
    const text = await file.text()
    const result = parseImportedPrinters(text)
    if (result.malformed) {
      setImportError('That file could not be read as a printers backup.')
      return
    }
    if (result.versionError) {
      setImportError('That backup was created by an unsupported version.')
      return
    }
    const seen = new Set(props.app.printers().map((p) => p.name.toLowerCase()))
    const merged = [...props.app.printers()]
    let imported = 0
    let duplicates = 0
    for (const printer of result.printers) {
      const key = printer.name.toLowerCase()
      if (seen.has(key)) {
        duplicates++
        continue
      }
      seen.add(key)
      merged.push(printer)
      imported++
    }
    props.app.setPrintersFromImport(merged)
    setImportSummary(
      `Imported ${imported}, skipped ${duplicates} duplicate${duplicates === 1 ? '' : 's'}, ${result.invalid} invalid.`,
    )
  }

  return (
    <div class="truss-manage">
      <h1 class="truss-flow-title">Saved printers</h1>

      <div class="truss-manage-toolbar">
        <Button variant="secondary" onClick={() => props.app.back()}>
          Back to home
        </Button>
        <Button onClick={openAdd}>Add printer</Button>
        <Button variant="secondary" onClick={() => fileInput?.click()}>
          Import
        </Button>
        <Show when={props.app.printers().length > 0}>
          <Button variant="secondary" onClick={exportPrinters}>
            Export
          </Button>
        </Show>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          class="truss-hidden-file"
          aria-label="Import printers JSON"
          onChange={importPrinters}
        />
      </div>

      <Show when={importError()}>
        <Notice variant="warning">{importError()}</Notice>
      </Show>
      <Show when={importSummary()}>
        <Notice>{importSummary()}</Notice>
      </Show>

      <Show
        when={sorted().length > 0}
        fallback={
          <p class="truss-empty">
            No saved printers yet. Run a Quad-Beam calibration to add one, or
            import a backup.
          </p>
        }
      >
        <div class="truss-printer-grid">
          <For each={sorted()}>
            {(printer) => (
              <div class="truss-printer-card">
                <h2 class="truss-printer-name">{printer.name}</h2>
                <p class="truss-printer-factor">
                  Extrapolation factor: {format5dp(printer.extrapolationFactor)}
                </p>
                <div class="truss-card-actions">
                  <Button variant="secondary" onClick={() => openEdit(printer)}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setDeleting(printer)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Modal
        open={editOpen()}
        title={editOriginal() === null ? 'Add printer' : 'Edit printer'}
        onClose={() => setEditOpen(false)}
      >
        <TextField
          id="truss-printer-name"
          label="Printer name"
          value={editName()}
          onInput={setEditName}
          error={
            editName() !== '' && !nameCheck().valid
              ? nameCheck().error
              : undefined
          }
        />
        <TextField
          id="truss-printer-factor"
          label="Extrapolation factor"
          type="number"
          inputmode="decimal"
          value={editFactor()}
          onInput={setEditFactor}
        />
        <Show when={factorCheck().valid && factorCheck().warn}>
          <WarningText>
            This factor is outside the expected 0.9–1.1 range - please
            double-check the measured values.
          </WarningText>
        </Show>
        <div class="truss-modal-actions">
          <Button variant="secondary" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveEdit} disabled={!editValid()}>
            Save
          </Button>
        </div>
      </Modal>

      <Modal
        open={deleting() !== null}
        title="Delete printer?"
        onClose={() => setDeleting(null)}
      >
        <p>
          Delete <strong>{deleting()?.name}</strong>? This cannot be undone.
        </p>
        <div class="truss-modal-actions">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
