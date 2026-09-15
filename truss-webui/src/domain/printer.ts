import type { PrinterRecord } from './types'

/**
 * The rules that decide what a valid printer record is (PRD §7).
 *
 * Defined once and shared by every layer that has to know: the payload schema
 * (so a foreign or edited file cannot be read into the app), the repository
 * (T08), and import (T10). Three private copies of "is this name acceptable"
 * would drift, and the failure would show up as a record that the store accepts
 * but the importer rejects.
 */

/** Identity is the *trimmed* name (PRD §7). */
export function normalizeName(name: string): string {
  return name.trim()
}

export function isValidName(name: string): boolean {
  return normalizeName(name) !== ''
}

/**
 * Case-insensitive name comparison, used to enforce uniqueness.
 *
 * Deliberately locale-independent (`toLowerCase`, not `toLocaleLowerCase`):
 * a locale-sensitive fold would make uniqueness depend on the machine's locale,
 * so the same two names could collide on one user's machine and not another's —
 * and the collision is a hard block, so that difference would be user-visible.
 */
export function namesMatch(a: string, b: string): boolean {
  return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase()
}

/**
 * A usable extrapolation factor: finite and strictly positive (PRD §7).
 *
 * `typeof value === 'number'` rather than a coercion: a factor arriving as the
 * string `"1.0034"` from a hand-edited file is *not* silently accepted, because
 * accepting it would mean the app's idea of a valid file depends on which
 * JSON serialiser wrote it.
 */
export function isValidFactor(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** Structural check of one record. Unknown extra keys are ignored, not refused. */
export function isValidPrinterRecord(value: unknown): value is PrinterRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const candidate = value as { name?: unknown; extrapolationFactor?: unknown }
  return (
    typeof candidate.name === 'string' &&
    isValidName(candidate.name) &&
    isValidFactor(candidate.extrapolationFactor)
  )
}

/** Produce the canonical stored form of a record (trimmed name, unchanged factor). */
export function normalizePrinterRecord(record: PrinterRecord): PrinterRecord {
  return { name: normalizeName(record.name), extrapolationFactor: record.extrapolationFactor }
}
