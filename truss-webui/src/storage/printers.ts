import { createSignal } from 'solid-js'
import { namesMatch, normalizeName, isValidFactor, isValidName } from '../domain/printer'
import { err, ok, type Result } from '../domain/result'
import { STORAGE_KEY_PRINTERS, PAYLOAD_VERSION, type PrinterRecord } from '../domain/types'
import type { StorageAdapter } from './adapter'
import { checkPrintersPayload } from './schema'

/**
 * The printer repository (PRD §7, §11).
 *
 * Printers are the only persisted entity, and the name *is* the identity — there
 * is no hidden id (decision 5). Everything that has to agree about that lives
 * here: normalisation, uniqueness, factor validity, the canonical order, and the
 * typed collision error that the mandatory save gate turns into recovery copy.
 *
 * Two deliberate choices:
 *
 * - **The list is kept in canonical order**, so `list()` can hand back the signal
 *   directly and no view can accidentally render an unsorted list.
 * - **A change in degraded mode still takes effect**, in memory, and reports
 *   `persisted: false`. It would be easier to fail the operation, but then the
 *   app would look broken in exactly the situation where PRD §12 asks it to keep
 *   working; the caller decides what to do with the news instead.
 */

export type PrinterError =
  | { readonly kind: 'invalid-name' }
  | { readonly kind: 'invalid-factor' }
  /** The name is taken by a *different* record (PRD §7, decision 5). */
  | { readonly kind: 'name-collision'; readonly name: string; readonly existingName: string }
  | { readonly kind: 'not-found'; readonly name: string }

export interface PrinterChange {
  /** The full, canonically ordered list after the change. */
  readonly printers: readonly PrinterRecord[]
  /** The record the change was about, when it was about one. */
  readonly record: PrinterRecord | null
  /** `false` when the change exists only in memory (degraded storage). */
  readonly persisted: boolean
}

export type PrinterWrite = Result<PrinterChange, PrinterError>

/**
 * Alphabetical, case-insensitive (PRD §13.6).
 *
 * `toLowerCase` rather than `localeCompare`, for the same reason uniqueness uses
 * it: the sort order must not depend on the machine's locale, or two users
 * comparing screenshots would see different lists and neither would be wrong.
 */
function compareByName(a: PrinterRecord, b: PrinterRecord): number {
  const left = a.name.toLowerCase()
  const right = b.name.toLowerCase()
  if (left < right) return -1
  if (left > right) return 1
  // Only reachable for names differing by case alone, which uniqueness forbids;
  // kept so the comparator is a total order regardless.
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
}

function sortCanonically(records: readonly PrinterRecord[]): readonly PrinterRecord[] {
  return [...records].sort(compareByName)
}

/** The stored form of a validated record. */
function canonical(record: PrinterRecord): PrinterRecord {
  return { name: normalizeName(record.name), extrapolationFactor: record.extrapolationFactor }
}

/** Reject a bad name or factor before uniqueness is even considered. */
function validate(record: PrinterRecord): PrinterError | null {
  if (typeof record.name !== 'string' || !isValidName(record.name)) {
    return { kind: 'invalid-name' }
  }
  if (!isValidFactor(record.extrapolationFactor)) {
    return { kind: 'invalid-factor' }
  }
  return null
}

export interface PrinterRepository {
  /** Exposed so screens can read degraded state and retained raw payloads. */
  readonly storage: StorageAdapter
  list(): readonly PrinterRecord[]
  getByName(name: string): PrinterRecord | null
  exists(name: string): boolean
  add(record: PrinterRecord): PrinterWrite
  update(originalName: string, record: PrinterRecord): PrinterWrite
  remove(name: string): PrinterWrite
  /**
   * Replace the whole set at once.
   *
   * For the import path (T10), which merges first and then commits once — and
   * for tests. Not a user-facing operation anywhere.
   */
  replaceAll(records: readonly PrinterRecord[]): PrinterWrite
}

export function createPrinterRepository(storage: StorageAdapter): PrinterRepository {
  function load(): readonly PrinterRecord[] {
    const read = storage.read(STORAGE_KEY_PRINTERS, checkPrintersPayload)
    // A corrupt or foreign payload is treated as empty; the adapter has already
    // kept the raw text so it remains exportable (PRD §12).
    return read.status === 'ok' ? read.payload.printers : []
  }

  const [printers, setPrinters] = createSignal<readonly PrinterRecord[]>(sortCanonically(load()))

  /** Commit a new list, reporting whether it reached persistent storage. */
  function commit(records: readonly PrinterRecord[], record: PrinterRecord | null): PrinterChange {
    const ordered = sortCanonically(records)
    setPrinters(ordered)

    const written = storage.write(STORAGE_KEY_PRINTERS, {
      version: PAYLOAD_VERSION,
      printers: ordered,
    })

    return { printers: ordered, record, persisted: written.ok }
  }

  /** Find an index by name, case-insensitively. */
  function indexOf(name: string): number {
    return printers().findIndex((candidate) => namesMatch(candidate.name, name))
  }

  /**
   * The collision check, with `except` excluding the record being changed so a
   * rename that only alters case does not collide with itself.
   */
  function collision(record: PrinterRecord, exceptIndex: number): PrinterError | null {
    const clash = printers().findIndex(
      (candidate, index) => index !== exceptIndex && namesMatch(candidate.name, record.name),
    )
    if (clash === -1) {
      return null
    }
    return {
      kind: 'name-collision',
      name: normalizeName(record.name),
      existingName: printers()[clash].name,
    }
  }

  return {
    storage,

    list(): readonly PrinterRecord[] {
      return printers()
    },

    getByName(name: string): PrinterRecord | null {
      const index = indexOf(name)
      return index === -1 ? null : printers()[index]
    },

    exists(name: string): boolean {
      return indexOf(name) !== -1
    },

    add(record: PrinterRecord): PrinterWrite {
      const invalid = validate(record)
      if (invalid !== null) {
        return err(invalid)
      }
      const clash = collision(record, -1)
      if (clash !== null) {
        return err(clash)
      }

      const stored = canonical(record)
      return ok(commit([...printers(), stored], stored))
    },

    update(originalName: string, record: PrinterRecord): PrinterWrite {
      const index = indexOf(originalName)
      if (index === -1) {
        return err({ kind: 'not-found', name: normalizeName(originalName) })
      }
      const invalid = validate(record)
      if (invalid !== null) {
        return err(invalid)
      }
      const clash = collision(record, index)
      if (clash !== null) {
        return err(clash)
      }

      const stored = canonical(record)
      const next = [...printers()]
      next[index] = stored
      return ok(commit(next, stored))
    },

    remove(name: string): PrinterWrite {
      const index = indexOf(name)
      if (index === -1) {
        return err({ kind: 'not-found', name: normalizeName(name) })
      }

      const removed = printers()[index]
      const next = printers().filter((_, position) => position !== index)
      return ok(commit(next, removed))
    },

    replaceAll(records: readonly PrinterRecord[]): PrinterWrite {
      for (const record of records) {
        const invalid = validate(record)
        if (invalid !== null) {
          return err(invalid)
        }
      }
      return ok(commit(records.map(canonical), null))
    },
  }
}
