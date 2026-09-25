// Japanese page content for Manage printers. PLACEHOLDER: currently English wording,
// to be translated before public release (implementation-plan task 9). Handlers/state
// come from the shared container.
import { For, Show } from 'solid-js'
import type { PrintersContentProps } from '../Printers.tsx'
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx'
import { PrinterFormDialog } from '../../components/PrinterFormDialog.tsx'
import { Icon } from '../../components/Icon.tsx'
import { LocaleSwitcher } from '../../components/LocaleSwitcher.tsx'
import { icons } from '../../lib/icons.ts'
import { printerErrorMessage } from '../../lib/messages.ts'

export function PrintersContent(props: PrintersContentProps) {
  return (
    <>
      <main class="container truss-printers">
        <div class="truss-flow-topbar">
          <LocaleSwitcher app={props.app} />
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
                        onClick={() => props.onEdit(index())}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        class="truss-button-secondary"
                        onClick={() => props.onDelete(index())}
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
          <button type="button" onClick={props.onAdd}>
            Add printer
          </button>
          <button type="button" class="truss-button-secondary" onClick={props.onExport}>
            Export JSON
          </button>
          <button type="button" class="truss-button-secondary" onClick={props.onImportClick}>
            Import JSON
          </button>
          <input
            ref={props.setFileInput}
            class="truss-visually-hidden"
            type="file"
            accept="application/json,.json"
            aria-label="Import printer profiles from a JSON file"
            onChange={(event) => props.onImport(event.currentTarget.files?.[0])}
          />
        </div>

        {props.importError && (
          <p class="truss-error" role="alert">
            Import failed: {printerErrorMessage(props.app.locale(), props.importError)}
          </p>
        )}
        {props.importSkipped.length > 0 && (
          <p class="truss-warning" role="status">
            Imported, but kept your saved profiles for {props.importSkipped.length} name
            {props.importSkipped.length === 1 ? '' : 's'} already present: {props.importSkipped.join(', ')}.
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
      </main>

      <Show when={props.adding}>
        <PrinterFormDialog
          title="Add printer"
          initialName=""
          initialFactor=""
          onClose={props.onCloseAdd}
          onSubmit={(name, factor) => props.onSubmitAdd(name, factor)}
        />
      </Show>

      <Show when={props.editingIndex !== null}>
        <PrinterFormDialog
          title="Edit printer"
          initialName={props.app.printers()[props.editingIndex!].name}
          initialFactor={String(props.app.printers()[props.editingIndex!].extrapolationFactor)}
          onClose={props.onCloseEdit}
          onSubmit={(name, factor) => props.onSubmitEdit(props.editingIndex!, name, factor)}
        />
      </Show>

      <Show when={props.deletingIndex !== null}>
        <ConfirmDialog
          title="Delete printer?"
          message={`Delete “${props.app.printers()[props.deletingIndex!].name}”? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={props.onConfirmDelete}
          onCancel={props.onCloseDelete}
        />
      </Show>
    </>
  )
}
