import { Dynamic } from 'solid-js/web'
import { createSignal } from 'solid-js'
import type { AppApi } from '../lib/app-api.ts'
import { addPrinter, deletePrinter, editPrinter, exportJSON, importJSON } from '../lib/printers.ts'
import type { PrinterError } from '../lib/printers.ts'
import { PrintersContent as PrintersEn } from './en/Printers.tsx'
import { PrintersContent as PrintersJa } from './ja/Printers.tsx'

// Props handed to the locale-specific page content. Handlers and dialog state
// stay here; copy and dialog text live in the content files.
export interface PrintersContentProps {
  app: AppApi
  adding: boolean
  editingIndex: number | null
  deletingIndex: number | null
  importError: PrinterError | null
  importSkipped: string[]
  onAdd: () => void
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  onCloseAdd: () => void
  onCloseEdit: () => void
  onCloseDelete: () => void
  onConfirmDelete: () => void
  onSubmitAdd: (name: string, factor: string) => PrinterError | null
  onSubmitEdit: (index: number, name: string, factor: string) => PrinterError | null
  onExport: () => void
  onImportClick: () => void
  onImport: (file: File | undefined) => void
  setFileInput: (el: HTMLInputElement) => void
}

export function Printers(props: { app: AppApi }) {
  const [editingIndex, setEditingIndex] = createSignal<number | null>(null)
  const [adding, setAdding] = createSignal(false)
  const [deletingIndex, setDeletingIndex] = createSignal<number | null>(null)
  const [importError, setImportError] = createSignal<PrinterError | null>(null)
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

  const submitAdd = (name: string, factor: string): PrinterError | null => {
    const result = addPrinter(props.app.printers(), name, factor)
    if (!result.ok) return result.error
    props.app.replacePrinters(result.printers)
    setAdding(false)
    return null
  }

  const submitEdit = (index: number, name: string, factor: string): PrinterError | null => {
    const result = editPrinter(props.app.printers(), index, name, factor)
    if (!result.ok) return result.error
    props.app.replacePrinters(result.printers)
    setEditingIndex(null)
    return null
  }

  const confirmDelete = () => {
    const index = deletingIndex()
    if (index === null) return
    props.app.replacePrinters(deletePrinter(props.app.printers(), index))
    setDeletingIndex(null)
  }

  return (
    <Dynamic
      component={props.app.locale() === 'ja' ? PrintersJa : PrintersEn}
      app={props.app}
      adding={adding()}
      editingIndex={editingIndex()}
      deletingIndex={deletingIndex()}
      importError={importError()}
      importSkipped={importSkipped()}
      onAdd={() => setAdding(true)}
      onEdit={setEditingIndex}
      onDelete={setDeletingIndex}
      onCloseAdd={() => setAdding(false)}
      onCloseEdit={() => setEditingIndex(null)}
      onCloseDelete={() => setDeletingIndex(null)}
      onConfirmDelete={confirmDelete}
      onSubmitAdd={submitAdd}
      onSubmitEdit={submitEdit}
      onExport={downloadExport}
      onImportClick={() => fileInput.click()}
      onImport={handleImport}
      setFileInput={(el) => (fileInput = el)}
    />
  )
}
