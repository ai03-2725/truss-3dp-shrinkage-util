import { STORAGE_KEYS, STORE_VERSION } from './constants'
import type { Prefs, Printer, PrintersStore } from './types'

/** Probe localStorage without throwing. PRD §15.2. */
export function isStorageAvailable(): boolean {
  try {
    const probe = '__truss_probe__'
    localStorage.setItem(probe, probe)
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

function validPrinter(value: unknown): value is Printer {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    typeof p.name === 'string' &&
    p.name.trim().length > 0 &&
    typeof p.extrapolationFactor === 'number' &&
    Number.isFinite(p.extrapolationFactor) &&
    p.extrapolationFactor > 0
  )
}

function validStore(value: unknown): value is PrintersStore {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    s.version === STORE_VERSION &&
    Array.isArray(s.printers) &&
    s.printers.every(validPrinter)
  )
}

/**
 * Load saved printers. Corrupt/missing data yields an empty list; corrupt data
 * is never deleted and sets `error` so the UI can warn. PRD §15.1.
 */
export function loadPrinters(): { printers: Printer[]; error: boolean } {
  if (!isStorageAvailable()) return { printers: [], error: false }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.printers)
    if (raw === null) return { printers: [], error: false }
    const parsed: unknown = JSON.parse(raw)
    if (!validStore(parsed)) return { printers: [], error: true }
    return { printers: parsed.printers, error: false }
  } catch {
    return { printers: [], error: true }
  }
}

/** Persist printers immediately. Returns false on quota/write failure. PRD §15.4. */
export function savePrinters(printers: Printer[]): boolean {
  if (!isStorageAvailable()) return false
  try {
    const store: PrintersStore = { version: STORE_VERSION, printers }
    localStorage.setItem(STORAGE_KEYS.printers, JSON.stringify(store))
    return true
  } catch {
    return false
  }
}

/** Load preferences, defaulting to not skipping. PRD §7.2. */
export function loadPrefs(): Prefs {
  const fallback: Prefs = { skipPrerequisiteCheck: false }
  if (!isStorageAvailable()) return fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.prefs)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return fallback
    return {
      skipPrerequisiteCheck: (parsed as Prefs).skipPrerequisiteCheck === true,
    }
  } catch {
    return fallback
  }
}

/** Persist preferences. Returns false on write failure. */
export function savePrefs(prefs: Prefs): boolean {
  if (!isStorageAvailable()) return false
  try {
    localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(prefs))
    return true
  } catch {
    return false
  }
}

export interface ImportResult {
  printers: Printer[]
  /** Count of entries skipped as invalid. */
  invalid: number
  /** Whole file malformed (bad JSON or wrong top-level shape). */
  malformed: boolean
  /** Unknown/future version — must be rejected with no changes. */
  versionError: boolean
}

/**
 * Parse an imported printers JSON file. Per-entry partial success is allowed;
 * a malformed file or unknown version is rejected wholesale. PRD §15.3.
 */
export function parseImportedPrinters(json: string): ImportResult {
  const reject: ImportResult = {
    printers: [],
    invalid: 0,
    malformed: true,
    versionError: false,
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return reject
  }
  if (typeof parsed !== 'object' || parsed === null) return reject
  const obj = parsed as Record<string, unknown>
  if (typeof obj.version !== 'number' || !Array.isArray(obj.printers))
    return reject
  if (obj.version !== STORE_VERSION) {
    return { printers: [], invalid: 0, malformed: false, versionError: true }
  }
  const printers: Printer[] = []
  let invalid = 0
  for (const entry of obj.printers) {
    if (validPrinter(entry)) printers.push(entry)
    else invalid++
  }
  return { printers, invalid, malformed: false, versionError: false }
}
