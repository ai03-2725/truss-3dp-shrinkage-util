import { For, Show, createMemo, createSignal, type JSX } from 'solid-js'
import { formatFactor, parseNumber } from '../domain/number'
import { isValidFactor, normalizeName } from '../domain/printer'
import type { PrinterRecord } from '../domain/types'
import type { FlowEngine } from '../flow/engine'
import type { PrinterRepository, PrinterError } from '../storage/printers'
import type { SettingsStore } from '../storage/settings'
import {
  exportFilename,
  isOversized,
  MAX_IMPORT_BYTES,
  mergePrinters,
  serializePrinters,
  type ImportRefusal,
} from '../storage/transfer'
import { announce, focusStepHeading, STEP_HEADING_ATTRIBUTE } from './a11y'

/**
 * Landing screen (T17, PRD §9.1).
 *
 * Two actions and nothing else: enter the calibration flow, or edit the saved
 * printer data. Deliberately minimal — everything the user needs at this point is
 * a decision about which of two things they are here to do.
 *
 * **Copy and documentation-link policy (§13.4).** The heading names the tool; the
 * two buttons say what they do in the user's own words ("Start a calibration",
 * "Saved printers") rather than in the app's internal vocabulary. The screen does
 * **not** link the canonical documentation: the flow carries the guidance it
 * needs at each step (goal 2 — "no separate document must be open alongside it"),
 * and a link out would be the first thing to break when the widget is embedded in
 * a host page that owns its own navigation, and the only thing that could take a
 * user out of the flow with measurements entered. The standalone `README.md`
 * remains the entry point for the written guides.
 */
export function Landing(props: { engine: FlowEngine }): JSX.Element {
  return (
    <section class="stack" aria-label="Truss Calibrator">
      <h1 tabindex="-1" {...{ [STEP_HEADING_ATTRIBUTE]: '' }}>
        Truss Calibrator
      </h1>
      <p>
        Measure a printed calibration beam with calipers and get the XY shrinkage value to enter in
        your slicer. All the arithmetic — the averaging, the extrapolation factor, the division by
        the designed length — is done for you.
      </p>

      <div class="stack">
        <button type="button" onClick={() => props.engine.startCalibration()} data-testid="start">
          Start a calibration
        </button>
        <button type="button" onClick={() => props.engine.goToPrinters()} data-testid="printers">
          Saved printers
        </button>
      </div>

      <p class="muted">
        Calibrated this printer before? Use “Saved printers” to check its extrapolation factor, then
        start a calibration and choose the quick flow.
      </p>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Printer data (T18–T23, PRD §11)                                             */
/* -------------------------------------------------------------------------- */

export interface PrinterDataProps {
  readonly engine: FlowEngine
  readonly printers: PrinterRepository
  readonly settings: SettingsStore
}

/**
 * The printer-data screen.
 *
 * One screen for everything that touches stored printers: the list, manual add,
 * edit, delete, import, export, and the prerequisites reset. Returning from here
 * always lands on the landing page (decision 17), because the screen is reachable
 * from two places (the landing page and C2's detour) and "go back where you came
 * from" would mean the C2 detour silently resumes a flow whose printer list the
 * user just changed.
 */
export function PrinterData(props: PrinterDataProps): JSX.Element {
  const [editing, setEditing] = createSignal<string | null>(null)
  const [adding, setAdding] = createSignal(false)
  const [pendingDelete, setPendingDelete] = createSignal<string | null>(null)
  const [status, setStatus] = createSignal<{ tone: 'ok' | 'error'; message: string } | null>(null)

  const degraded = () => props.printers.storage.degraded()
  const retained = () => props.printers.storage.retainedRaw('truss-calibrator:v1:printers')
  const skipPrerequisites = () => props.settings.skipPrerequisites()

  function report(tone: 'ok' | 'error', message: string): void {
    setStatus({ tone, message })
    if (tone === 'error') {
      // A refusal the user cannot see is a refusal they will retry forever.
      announce(message, 'assertive')
    }
  }

  /** Refusal reasons are distinct in the domain; they must stay distinct here. */
  function describeRefusal(refusal: ImportRefusal): string {
    switch (refusal.kind) {
      case 'too-large':
        return `That file is ${Math.round(refusal.bytes / 1024)}KB, which is far larger than a printer list. It is probably not the right file.`
      case 'invalid-json':
        return 'That file is not valid JSON. Choose the file this app exported.'
      case 'not-an-object':
        return 'That file does not contain a printer list.'
      case 'unsupported-version':
        return `That file was written by a newer version of this app (${refusal.detail}).`
      case 'malformed':
        return `That file is missing part of its structure: ${refusal.detail}`
      case 'invalid-record':
        return `Nothing was imported: ${refusal.detail} Every record must have a name and a positive factor.`
    }
  }

  async function importFile(file: File): Promise<void> {
    if (isOversized(file.size)) {
      report(
        'error',
        describeRefusal({ kind: 'too-large', bytes: file.size, limit: MAX_IMPORT_BYTES }),
      )
      return
    }

    let text: string
    try {
      text = await file.text()
    } catch {
      report('error', 'That file could not be read.')
      return
    }

    const outcome = mergePrinters(text, props.printers.list())
    if (!outcome.ok) {
      report('error', describeRefusal(outcome.refusal))
      return
    }

    const committed = props.printers.replaceAll(outcome.merged)
    if (!committed.ok) {
      report('error', 'The imported printers could not be stored.')
      return
    }

    const parts = [`${outcome.added.length} added`]
    if (outcome.skipped.length > 0) {
      // The count *and* the names: a count alone leaves the user unable to tell
      // whether the record they cared about was the one skipped.
      parts.push(`${outcome.skipped.length} skipped (already saved): ${outcome.skipped.join(', ')}`)
    }
    if (!committed.value.persisted) {
      parts.push('not saved — storage is unavailable in this browser session')
    }
    report('ok', `Import finished: ${parts.join('; ')}.`)
  }

  function exportPrinters(): void {
    const json = serializePrinters(props.printers.list())
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = exportFilename()
    link.rel = 'noopener'
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const empty = createMemo(() => props.printers.list().length === 0)

  return (
    <section class="stack" aria-label="Saved printers">
      <h1 tabindex="-1" {...{ [STEP_HEADING_ATTRIBUTE]: '' }}>
        Saved printers
      </h1>

      <Show when={degraded().degraded}>
        <p class="banner" role="status" data-testid="degraded-banner">
          <strong>Changes won’t be saved.</strong> This browser is not letting the app store data
          (private browsing, or site data turned off). Everything works, but anything you add or
          change disappears when the page is closed — write down any factor you need.
        </p>
      </Show>

      <Show when={retained() !== null}>
        <div class="banner" role="status" data-testid="corrupt-banner">
          <p>
            <strong>Stored printer data could not be read.</strong> It has been left untouched
            rather than overwritten, and the list below starts empty. Export it to keep a copy
            before saving anything new.
          </p>
          <button
            type="button"
            onClick={() => {
              const raw = retained()
              if (raw === null) return
              const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
              const link = document.createElement('a')
              link.href = url
              link.download = `${exportFilename().replace(/\.json$/, '')}-unreadable.json`
              document.body.append(link)
              link.click()
              link.remove()
              URL.revokeObjectURL(url)
            }}
            data-testid="export-unreadable"
          >
            Export the unreadable data
          </button>
        </div>
      </Show>

      <Show when={status()}>
        {(current) => (
          <p
            class={current().tone === 'error' ? 'banner' : 'muted'}
            role={current().tone === 'error' ? 'alert' : 'status'}
            data-testid="printer-status"
          >
            {current().message}
          </p>
        )}
      </Show>

      <Show
        when={!empty()}
        fallback={
          <p data-testid="empty-state">
            No printers are saved yet. Run a first-time (quad) calibration to save one, or import a
            file you exported earlier.
          </p>
        }
      >
        <ul class="stack" data-testid="printer-list">
          <For each={props.printers.list()}>
            {(printer) => (
              <li>
                <Show
                  when={editing() !== normalizeName(printer.name)}
                  fallback={
                    <PrinterForm
                      title={`Edit ${printer.name}`}
                      initial={printer}
                      submitLabel="Save changes"
                      onCancel={() => setEditing(null)}
                      onSubmit={(record) => {
                        const result = props.printers.update(printer.name, record)
                        if (!result.ok) {
                          report('error', describeError(result.error))
                          return
                        }
                        setEditing(null)
                        report(
                          result.value.persisted ? 'ok' : 'error',
                          result.value.persisted
                            ? `Saved ${result.value.record?.name}.`
                            : 'Changed, but not saved — storage is unavailable.',
                        )
                      }}
                    />
                  }
                >
                  <div class="row">
                    <span>{printer.name}</span>
                    <span class="numeric muted">{formatFactor(printer.extrapolationFactor)}</span>
                    <button type="button" onClick={() => setEditing(normalizeName(printer.name))}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingDelete(pendingDelete() === printer.name ? null : printer.name)
                      }
                      aria-expanded={pendingDelete() === printer.name}
                    >
                      Delete
                    </button>
                  </div>
                </Show>

                <Show when={pendingDelete() === printer.name}>
                  <div class="warning" role="group" aria-label={`Confirm deleting ${printer.name}`}>
                    <p>
                      <strong>Delete “{printer.name}”?</strong> This cannot be undone, and its
                      extrapolation factor is the only record of that calibration. Deleting is also
                      the only way to replace a printer from an imported file: import never
                      overwrites a saved name.
                    </p>
                    <div class="row">
                      <button type="button" onClick={() => setPendingDelete(null)}>
                        Keep
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const result = props.printers.remove(printer.name)
                          setPendingDelete(null)
                          if (!result.ok) {
                            report('error', describeError(result.error))
                            return
                          }
                          report('ok', `Deleted ${printer.name}.`)
                        }}
                        data-testid={`confirm-delete-${printer.name}`}
                      >
                        Delete permanently
                      </button>
                    </div>
                  </div>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <Show
        when={adding()}
        fallback={
          <button type="button" onClick={() => setAdding(true)} data-testid="add-printer">
            Add a printer manually
          </button>
        }
      >
        <PrinterForm
          title="Add a printer"
          initial={{ name: '', extrapolationFactor: 1 }}
          submitLabel="Add printer"
          onCancel={() => setAdding(false)}
          onSubmit={(record) => {
            const result = props.printers.add(record)
            if (!result.ok) {
              report('error', describeError(result.error))
              return
            }
            setAdding(false)
            report(
              result.value.persisted ? 'ok' : 'error',
              result.value.persisted
                ? `Added ${result.value.record?.name}.`
                : 'Added, but not saved — storage is unavailable.',
            )
          }}
        />
      </Show>

      <div class="row">
        <button type="button" onClick={exportPrinters} data-testid="export">
          Export printers
        </button>
        <FileImportButton onFile={importFile} />
      </div>

      <p class="muted">
        Importing merges by name and <strong>saved values always win</strong>: a printer you already
        have is skipped rather than replaced. To restore an older backup over current data, delete
        those printers here first — importing will not overwrite them.
      </p>

      <fieldset>
        <legend>Getting started checklist</legend>
        <p class="muted">
          The “Before you start” checklist is skipped on runs where you asked not to see it again.
          This is the only place to bring it back.
        </p>
        <Show
          when={skipPrerequisites()}
          fallback={<p data-testid="prereq-state">The checklist will be shown when you start.</p>}
        >
          <p data-testid="prereq-state">The checklist is currently skipped.</p>
          <button
            type="button"
            onClick={() => {
              const change = props.settings.resetPrerequisites()
              report(
                change.persisted ? 'ok' : 'error',
                change.persisted
                  ? 'The prerequisites checklist will be shown again.'
                  : 'Shown again for this session, but the setting could not be saved.',
              )
            }}
            data-testid="reset-prereq"
          >
            Show the checklist again
          </button>
        </Show>
      </fieldset>

      <div class="row">
        <button
          type="button"
          onClick={() => props.engine.goToLanding()}
          data-testid="back-to-landing"
        >
          Back
        </button>
      </div>
    </section>
  )
}

function describeError(error: PrinterError): string {
  switch (error.kind) {
    case 'invalid-name':
      return 'Give the printer a name.'
    case 'invalid-factor':
      return 'The extrapolation factor must be a number greater than zero.'
    case 'name-collision':
      return `“${error.name}” is already saved as “${error.existingName}”. Printer names are unique and are not case-sensitive.`
    case 'not-found':
      return `“${error.name}” is no longer saved.`
  }
}

function FileImportButton(props: { onFile: (file: File) => void }): JSX.Element {
  let input: HTMLInputElement | undefined

  return (
    <>
      <button type="button" onClick={() => input?.click()} data-testid="import">
        Import printers
      </button>
      <input
        ref={(element) => {
          input = element
        }}
        type="file"
        accept="application/json,.json"
        class="sr-only"
        data-testid="import-input"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          // Reset first, so choosing the same file twice still fires a change.
          event.currentTarget.value = ''
          if (file !== undefined) {
            props.onFile(file)
          }
        }}
      />
    </>
  )
}

interface PrinterFormProps {
  readonly title: string
  readonly initial: PrinterRecord
  readonly submitLabel: string
  readonly onCancel: () => void
  readonly onSubmit: (record: PrinterRecord) => void
}

/**
 * Name + factor, with validation.
 *
 * The factor field carries an inline warning about where the number should come
 * from (T19.2). A hand-typed factor is legitimate — importing data in is the
 * whole reason manual add exists (decision 19) — but it is indistinguishable on
 * screen from a measured one, so the field says which it should be.
 */
function PrinterForm(props: PrinterFormProps): JSX.Element {
  const [name, setName] = createSignal(props.initial.name)
  const [factor, setFactor] = createSignal(String(props.initial.extrapolationFactor))

  const nameError = () => (normalizeName(name()) === '' ? 'Give the printer a name.' : null)
  const factorParsed = () => parseNumber(factor())
  const factorError = () => {
    if (factor().trim() === '') {
      return 'Enter the extrapolation factor.'
    }
    const parsed = factorParsed()
    if (!parsed.ok) {
      return parsed.error.code === 'incomplete' ? null : `“${factor().trim()}” is not a number.`
    }
    return isValidFactor(parsed.value) ? null : 'The factor must be greater than zero.'
  }
  const valid = () => nameError() === null && factorError() === null

  return (
    <form
      class="stack"
      onSubmit={(event) => {
        event.preventDefault()
        if (!valid()) return
        const parsed = factorParsed()
        if (!parsed.ok) return
        props.onSubmit({ name: normalizeName(name()), extrapolationFactor: parsed.value })
      }}
      aria-label={props.title}
    >
      <h2>{props.title}</h2>

      <div class="stack">
        <label for="printer-name">Printer name</label>
        <input
          id="printer-name"
          type="text"
          autocomplete="off"
          value={name()}
          aria-invalid={nameError() === null ? 'false' : 'true'}
          aria-describedby={nameError() === null ? undefined : 'printer-name-error'}
          onInput={(event) => setName(event.currentTarget.value)}
        />
        <Show when={nameError()}>
          {(message) => (
            <p class="error" id="printer-name-error" role="alert">
              {message()}
            </p>
          )}
        </Show>
      </div>

      <div class="stack">
        <label for="printer-factor">Extrapolation factor</label>
        <input
          id="printer-factor"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          value={factor()}
          aria-invalid={factorError() === null ? 'false' : 'true'}
          aria-describedby="printer-factor-warning printer-factor-error"
          onInput={(event) => setFactor(event.currentTarget.value)}
        />
        <p class="warning" id="printer-factor-warning" data-testid="factor-warning">
          This should come from a quad (first-time) calibration on this printer. A quick-flow result
          is <em>extrapolated from</em> the factor stored here, so typing an extrapolated value here
          would compound the estimate.
        </p>
        <Show when={factorError()}>
          {(message) => (
            <p class="error" id="printer-factor-error" role="alert">
              {message()}
            </p>
          )}
        </Show>
      </div>

      <div class="row">
        <button type="button" onClick={() => props.onCancel()}>
          Cancel
        </button>
        <button type="submit" disabled={!valid()} data-testid="submit-printer">
          {props.submitLabel}
        </button>
      </div>
    </form>
  )
}

/** Exported so the screen's own tests can focus its heading like a real entry does. */
export function focusPrinterDataHeading(root: ParentNode): boolean {
  return focusStepHeading(root)
}
