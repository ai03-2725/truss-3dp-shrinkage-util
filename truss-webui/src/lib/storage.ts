import {
  PREFS_STORAGE_KEY,
  PRINTERS_STORAGE_KEY,
  STORE_VERSION,
} from './constants'
import type { Prefs, Printer } from './types'

/**
 * Storage isolation layer (PRD §7, §15.1–§15.4). Screens never touch
 * localStorage directly; every failure is handled here.
 */

/** Probe localStorage without leaking exceptions. */
export function isStorageAvailable(): boolean {
  try {
    const probe = '__truss_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Shape check for a single printer entry. */
export function isValidPrinter(value: unknown): value is Printer {
  if (!isRecord(value)) return false
  const { name, extrapolationFactor } = value
  return (
    typeof name === 'string' &&
    name.trim().length > 0 &&
    typeof extrapolationFactor === 'number' &&
    Number.isFinite(extrapolationFactor) &&
    extrapolationFactor > 0
  )
}

/**
 * Load saved printers. Corrupt or unreadable data yields an empty list and
 * `error: true`; the bad data is never deleted (PRD §15.1).
 */
export function loadPrinters(): { printers: Printer[]; error: boolean } {
  if (!isStorageAvailable()) return { printers: [], error: false }
  let raw: string | null
  try {
    raw = localStorage.getItem(PRINTERS_STORAGE_KEY)
  } catch {
    return { printers: [], error: true }
  }
  if (raw === null) return { printers: [], error: false }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || !Array.isArray(parsed.printers)) {
      return { printers: [], error: true }
    }
    const printers = parsed.printers.filter(isValidPrinter)
    if (printers.length !== parsed.printers.length) {
      return { printers, error: true }
    }
    return { printers, error: false }
  } catch {
    return { printers: [], error: true }
  }
}

/** Persist the full printer list. Returns false on any write failure (PRD §15.4). */
export function savePrinters(printers: Printer[]): boolean {
  if (!isStorageAvailable()) return false
  try {
    const store = { version: STORE_VERSION, printers }
    localStorage.setItem(PRINTERS_STORAGE_KEY, JSON.stringify(store))
    return true
  } catch {
    return false
  }
}

/** Load preferences, falling back to defaults on any failure. */
export function loadPrefs(): Prefs {
  const fallback: Prefs = { skipPrerequisiteCheck: false }
  if (!isStorageAvailable()) return fallback
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return fallback
    return { skipPrerequisiteCheck: parsed.skipPrerequisiteCheck === true }
  } catch {
    return fallback
  }
}

/** Persist preferences. Returns false on any write failure. */
export function savePrefs(prefs: Prefs): boolean {
  if (!isStorageAvailable()) return false
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
    return true
  } catch {
    return false
  }
}

export interface ImportResult {
  printers: Printer[]
  /** Number of entries rejected for shape/range reasons. */
  invalid: number
  /** True when the file is not parseable or lacks the required structure. */
  malformed: boolean
  /** True when the version is missing, non-numeric, or unknown. */
  versionError: boolean
}

/**
 * Merge imported printers into the existing list, keeping existing entries on
 * case-insensitive name conflicts (PRD §15.3). Returns the merged list and the
 * number of skipped duplicates.
 */
export function mergePrinters(
  existing: Printer[],
  incoming: Printer[],
): { printers: Printer[]; duplicates: number } {
  const names = new Set(existing.map((p) => p.name.trim().toLowerCase()))
  const merged = [...existing]
  let duplicates = 0
  for (const printer of incoming) {
    const key = printer.name.trim().toLowerCase()
    if (names.has(key)) {
      duplicates += 1
      continue
    }
    names.add(key)
    merged.push(printer)
  }
  return { printers: merged, duplicates }
}

/**
 * Validate an exported JSON string (PRD §15.3). Partial success is allowed:
 * valid entries are returned, invalid ones counted.
 */
export function parseImportedPrinters(json: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { printers: [], invalid: 0, malformed: true, versionError: false }
  }
  if (!isRecord(parsed)) {
    return { printers: [], invalid: 0, malformed: true, versionError: false }
  }
  if (typeof parsed.version !== 'number' || parsed.version !== STORE_VERSION) {
    return { printers: [], invalid: 0, malformed: false, versionError: true }
  }
  if (!Array.isArray(parsed.printers)) {
    return { printers: [], invalid: 0, malformed: true, versionError: false }
  }
  const printers: Printer[] = []
  let invalid = 0
  for (const entry of parsed.printers) {
    if (isValidPrinter(entry)) {
      printers.push({
        name: entry.name,
        extrapolationFactor: entry.extrapolationFactor,
      })
    } else {
      invalid += 1
    }
  }
  return { printers, invalid, malformed: false, versionError: false }
}
