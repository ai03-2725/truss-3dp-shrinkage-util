import { isValidPrinterRecord } from '../domain/printer'
import {
  PAYLOAD_VERSION,
  type PrinterRecord,
  type PrintersPayload,
  type SettingsPayload,
} from '../domain/types'

/**
 * Envelope checks for stored and imported payloads (PRD §7, §11.2).
 *
 * A `SchemaIssue` is returned rather than a boolean because the import path
 * (T10) must refuse with a *specific* reason — "unsupported version" and
 * "malformed shape" are different things to tell a user, and only one of them is
 * worth them acting on.
 */

export type SchemaIssue =
  /** Not a JSON object at all. */
  | 'not-an-object'
  /** A payload version this build does not understand. */
  | 'unsupported-version'
  /** Readable JSON with the wrong shape. */
  | 'malformed'
  /** Structurally fine, but at least one record violates PRD §7. */
  | 'invalid-record'

export type SchemaCheck<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issue: SchemaIssue; readonly detail: string }

function fail<T>(issue: SchemaIssue, detail: string): SchemaCheck<T> {
  return { ok: false, issue, detail }
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

/**
 * Check a printers payload.
 *
 * The check is **all-or-nothing** (PRD §11.2): one bad record refuses the whole
 * payload. A partially-applied import is worse than a refused one, because the
 * user cannot tell which half landed.
 */
export function checkPrintersPayload(value: unknown): SchemaCheck<PrintersPayload> {
  const envelope = asObject(value)
  if (envelope === null) {
    return fail('not-an-object', 'Payload is not a JSON object.')
  }
  if (envelope.version !== PAYLOAD_VERSION) {
    return fail(
      'unsupported-version',
      `Expected payload version ${PAYLOAD_VERSION}, received ${JSON.stringify(envelope.version)}.`,
    )
  }
  if (!Array.isArray(envelope.printers)) {
    return fail('malformed', 'Payload is missing a "printers" array.')
  }

  const printers: PrinterRecord[] = []
  for (const [index, entry] of envelope.printers.entries()) {
    if (!isValidPrinterRecord(entry)) {
      return fail('invalid-record', `Record ${index + 1} is not a usable printer.`)
    }
    printers.push({ name: entry.name, extrapolationFactor: entry.extrapolationFactor })
  }

  return { ok: true, value: { version: PAYLOAD_VERSION, printers } }
}

/** Check a settings payload. */
export function checkSettingsPayload(value: unknown): SchemaCheck<SettingsPayload> {
  const envelope = asObject(value)
  if (envelope === null) {
    return fail('not-an-object', 'Payload is not a JSON object.')
  }
  if (envelope.version !== PAYLOAD_VERSION) {
    return fail(
      'unsupported-version',
      `Expected payload version ${PAYLOAD_VERSION}, received ${JSON.stringify(envelope.version)}.`,
    )
  }
  if (typeof envelope.skipPrerequisites !== 'boolean') {
    return fail('malformed', 'Payload is missing a boolean "skipPrerequisites".')
  }

  return {
    ok: true,
    value: { version: PAYLOAD_VERSION, skipPrerequisites: envelope.skipPrerequisites },
  }
}
