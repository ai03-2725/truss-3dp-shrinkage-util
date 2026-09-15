import { namesMatch, normalizeName } from '../domain/printer'
import { PAYLOAD_VERSION, type PrinterRecord } from '../domain/types'
import { checkPrintersPayload, type SchemaIssue } from './schema'

/**
 * Export and import (PRD §11.1–§11.3).
 *
 * Three rules shape this module:
 *
 * 1. **Full precision in the file.** The display formatters round to 10dp; a
 *    factor written at 10dp would be degraded a little on *every* round trip,
 *    silently, and the user would never see it happen. `JSON.stringify` writes
 *    the shortest representation that reads back as the identical double, which
 *    is exactly the requirement (T10.2).
 * 2. **Import is all-or-nothing.** Invalid JSON, an unexpected shape, an
 *    unsupported version, or any unusable record refuses the whole file with a
 *    specific reason. A half-applied import is worse than a refused one, because
 *    the user cannot tell which half landed.
 * 3. **Merge is add-only; existing values always win.** Conflicts are counted and
 *    named. The accepted consequence — an older backup cannot overwrite damaged
 *    current data without deleting the conflicting records first — is the UI's
 *    job to state (T23), not something to paper over here.
 */

/** Printer data only; the prerequisites flag is app state (PRD §11.3). */
export interface ExportShape {
  readonly version: number
  readonly printers: readonly PrinterRecord[]
}

/**
 * Refusal ceiling, checked before the file is read into memory.
 *
 * A record is under a hundred bytes of JSON, so even ten thousand printers sit
 * well under a megabyte; anything larger is the wrong file. Refusing on `size`
 * first means a mis-picked 2GB file is rejected without reading it.
 */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

export function serializePrinters(printers: readonly PrinterRecord[]): string {
  const payload: ExportShape = {
    version: PAYLOAD_VERSION,
    printers: printers.map((record) => ({
      name: record.name,
      extrapolationFactor: record.extrapolationFactor,
    })),
  }
  // Indented, because the file is meant to be hand-editable and diffable.
  return JSON.stringify(payload, null, 2)
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** `truss-printers-YYYY-MM-DD.json`, dated in the user's own timezone. */
export function exportFilename(now: Date = new Date()): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return `truss-printers-${date}.json`
}

/* -------------------------------------------------------------------------- */
/* Import                                                                      */
/* -------------------------------------------------------------------------- */

/** A specific reason the import was refused (PRD §11.2). */
export type ImportRefusal =
  | { readonly kind: 'too-large'; readonly bytes: number; readonly limit: number }
  | { readonly kind: 'invalid-json'; readonly detail: string }
  | { readonly kind: 'not-an-object'; readonly detail: string }
  | { readonly kind: 'unsupported-version'; readonly detail: string }
  | { readonly kind: 'malformed'; readonly detail: string }
  | { readonly kind: 'invalid-record'; readonly detail: string }

export interface ImportMerge {
  readonly ok: true
  /** The complete list to store: the existing records, then the added ones. */
  readonly merged: readonly PrinterRecord[]
  /** Names added, in file order. */
  readonly added: readonly string[]
  /** Names skipped because the name already existed, in file order. */
  readonly skipped: readonly string[]
}

export type ImportOutcome = ImportMerge | { readonly ok: false; readonly refusal: ImportRefusal }

/** Map a payload-schema issue onto the matching refusal, one-to-one. */
function refusalForIssue(issue: SchemaIssue, detail: string): ImportRefusal {
  switch (issue) {
    case 'not-an-object':
      return { kind: 'not-an-object', detail }
    case 'unsupported-version':
      return { kind: 'unsupported-version', detail }
    case 'malformed':
      return { kind: 'malformed', detail }
    case 'invalid-record':
      return { kind: 'invalid-record', detail }
  }
}

/**
 * Validate and merge a file's text into the existing records.
 *
 * Pure: it computes the merged list and changes nothing, so the caller decides
 * when to commit (and the same function serves the tests without a store).
 *
 * A name repeated *within* the file is treated as a conflict rather than as an
 * invalid file: uniqueness is a merge concern, and the first occurrence is the
 * one that wins — the same rule the user is being told about. It is reported in
 * `skipped` so the count the UI shows accounts for it.
 */
export function mergePrinters(text: string, existing: readonly PrinterRecord[]): ImportOutcome {
  if (text.length > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      refusal: { kind: 'too-large', bytes: text.length, limit: MAX_IMPORT_BYTES },
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch (error) {
    return {
      ok: false,
      refusal: {
        kind: 'invalid-json',
        detail: error instanceof Error ? error.message : 'Unreadable.',
      },
    }
  }

  const checked = checkPrintersPayload(parsed)
  if (!checked.ok) {
    return { ok: false, refusal: refusalForIssue(checked.issue, checked.detail) }
  }

  const merged: PrinterRecord[] = [...existing]
  const added: string[] = []
  const skipped: string[] = []

  for (const record of checked.value.printers) {
    const name = normalizeName(record.name)
    if (merged.some((candidate) => namesMatch(candidate.name, name))) {
      skipped.push(name)
      continue
    }
    const stored: PrinterRecord = { name, extrapolationFactor: record.extrapolationFactor }
    merged.push(stored)
    added.push(name)
  }

  return { ok: true, merged, added, skipped }
}

/** Whether a file of `bytes` is too large to consider, for the pre-read check. */
export function isOversized(bytes: number): boolean {
  return bytes > MAX_IMPORT_BYTES
}
