import { type Component, createMemo, createSignal, For, Show } from 'solid-js'
import { Button } from '../components/ui/Button'
import { NumberField, TextField } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Notice } from '../components/ui/Notice'
import { format5dp } from '../lib/calc'
import { buildExportJson, exportFilename } from '../lib/export'
import { mergePrinters, parseImportedPrinters } from '../lib/storage'
import type { Printer } from '../lib/types'
import {
  FACTOR_RANGE_WARNING,
  validateFactor,
  validatePrinterName,
} from '../lib/validation'

export interface ManagePrintersProps {
  printers: Printer[]
  onAdd: (printer: Printer) => void
  onUpdate: (originalName: string, printer: Printer) => void
  onDelete: (name: string) => void
  onSetPrinters: (printers: Printer[]) => void
  onBack: () => void
}

/** Printer management screen (PRD §12, §15.3). */
export const ManagePrinters: Component<ManagePrintersProps> = (props) => {
  const [formOpen, setFormOpen] = createSignal(false)
  const [editingName, setEditingName] = createSignal<string | null>(null)
  const [name, setName] = createSignal('')
  const [factor, setFactor] = createSignal('')
  const [deleteTarget, setDeleteTarget] = createSignal<string | null>(null)
  const [importMessage, setImportMessage] = createSignal<string | null>(null)
  let fileInput: HTMLInputElement | undefined

  const sorted = createMemo(() =>
    [...props.printers].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
    ),
  )

  const nameValidation = createMemo(() =>
    validatePrinterName(
      name(),
      props.printers.map((printer) => printer.name),
      editingName() ?? undefined,
    ),
  )
  const factorValidation = createMemo(() => validateFactor(factor()))
  const formValid = () => nameValidation().valid && factorValidation().valid

  const openAdd = () => {
    setEditingName(null)
    setName('')
    setFactor('')
    setFormOpen(true)
  }

  const openEdit = (printer: Printer) => {
    setEditingName(printer.name)
    setName(printer.name)
    setFactor(String(printer.extrapolationFactor))
    setFormOpen(true)
  }

  const save = () => {
    if (!formValid()) return
    const printer = {
      name: name().trim(),
      extrapolationFactor: Number(factor()),
    }
    const original = editingName()
    if (original === null) props.onAdd(printer)
    else props.onUpdate(original, printer)
    setFormOpen(false)
  }

  const exportJson = () => {
    const blob = new Blob([buildExportJson(props.printers)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = exportFilename()
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File) => {
    const text = await file.text()
    const parsed = parseImportedPrinters(text)
    if (parsed.malformed || parsed.versionError) {
      setImportMessage(
        parsed.versionError
          ? 'This file was created by an unsupported version and was not imported.'
          : 'This file could not be read as a printer export.',
      )
      return
    }
    const { printers: merged, duplicates } = mergePrinters(
      props.printers,
      parsed.printers,
    )
    const imported = merged.length - props.printers.length
    props.onSetPrinters(merged)
    setImportMessage(
      `Imported ${imported}, skipped ${duplicates} duplicate, ${parsed.invalid} invalid`,
    )
  }

  return (
    <div class="truss-page truss-manage">
      <h1 class="truss-page__title">Saved printers</h1>
      <p class="truss-page__lede">
        Extrapolation factors saved from Quad calibrations on this device.
      </p>

      <Show when={importMessage()}>
        <Notice>{importMessage()}</Notice>
      </Show>

      <div class="truss-manage__actions">
        <Button onClick={openAdd}>Add printer</Button>
        <Button variant="secondary" onClick={() => fileInput?.click()}>
          Import
        </Button>
        <Show when={props.printers.length > 0}>
          <Button variant="secondary" onClick={exportJson}>
            Export
          </Button>
        </Show>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            if (file) void handleImport(file)
            event.currentTarget.value = ''
          }}
        />
      </div>

      <Show
        when={props.printers.length > 0}
        fallback={
          <p class="truss-page__lede">
            No saved printers yet. Run a Quad-Beam calibration to save one, or
            import a printer export.
          </p>
        }
      >
        <div class="truss-printers">
          <For each={sorted()}>
            {(printer) => (
              <div class="truss-printer-card">
                <div>
                  <p class="truss-printer-card__name">{printer.name}</p>
                  <p class="truss-printer-card__factor">
                    Factor: {format5dp(printer.extrapolationFactor)}
                  </p>
                </div>
                <div class="truss-printer-card__actions">
                  <Button variant="secondary" onClick={() => openEdit(printer)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setDeleteTarget(printer.name)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Button variant="secondary" onClick={props.onBack}>
        Back to home
      </Button>

      <Modal
        open={formOpen()}
        title={editingName() === null ? 'Add printer' : 'Edit printer'}
        onClose={() => setFormOpen(false)}
      >
        <TextField
          id="truss-printer-name"
          label="Printer name"
          value={name()}
          onInput={setName}
          error={name() !== '' ? nameValidation().error : undefined}
        />
        <NumberField
          id="truss-printer-factor"
          label="Extrapolation factor"
          value={factor()}
          onInput={setFactor}
          warning={factorValidation().warn ? FACTOR_RANGE_WARNING : undefined}
        />
        <div class="truss-modal__actions">
          <Button variant="secondary" onClick={() => setFormOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!formValid()} onClick={save}>
            Save
          </Button>
        </div>
      </Modal>

      <Modal
        open={deleteTarget() !== null}
        title="Delete printer"
        onClose={() => setDeleteTarget(null)}
      >
        <p>Delete “{deleteTarget()}”? This cannot be undone.</p>
        <div class="truss-modal__actions">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const target = deleteTarget()
              if (target !== null) props.onDelete(target)
              setDeleteTarget(null)
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
