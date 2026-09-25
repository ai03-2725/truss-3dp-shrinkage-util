// Printer profile operations and versioned JSON portability.
// Pure list-in / list-out (or result) functions with no browser or UI coupling.

import type { Printer } from './types.ts'
import { namesMatch, normalizeName, parsePositiveDecimal } from './calc.ts'

export const EXPORT_VERSION = 1

// Stable error identifiers. UI code renders these through the locale messages so
// an already-visible error changes language without re-running the action.
export type PrinterError =
  | { code: 'nameRequired' }
  | { code: 'nameDuplicate'; name: string }
  | { code: 'factorInvalid' }
  | { code: 'notFound' }
  | { code: 'invalidJson' }
  | { code: 'notExportObject' }
  | { code: 'unsupportedVersion'; expected: number }
  | { code: 'printersList' }
  | { code: 'entryNotObject' }
  | { code: 'entryNameEmpty' }
  | { code: 'entryFactorInvalid'; name: string }
  | { code: 'duplicateInFile'; name: string }

export type PrinterOpResult =
  | { ok: true; printers: Printer[] }
  | { ok: false; error: PrinterError }

function validateName(printers: Printer[], name: string, ignoreIndex = -1): PrinterError | null {
  const trimmed = normalizeName(name)
  if (!trimmed) return { code: 'nameRequired' }
  if (printers.some((printer, index) => index !== ignoreIndex && namesMatch(printer.name, trimmed))) {
    return { code: 'nameDuplicate', name: trimmed }
  }
  return null
}

function validateFactor(factorInput: string): number | null {
  return parsePositiveDecimal(factorInput)
}

export function addPrinter(
  printers: Printer[],
  name: string,
  factorInput: string,
): PrinterOpResult {
  const nameError = validateName(printers, name)
  if (nameError) return { ok: false, error: nameError }
  const factor = validateFactor(factorInput)
  if (factor === null) {
    return { ok: false, error: { code: 'factorInvalid' } }
  }
  return { ok: true, printers: [...printers, { name: normalizeName(name), extrapolationFactor: factor }] }
}

export function editPrinter(
  printers: Printer[],
  index: number,
  name: string,
  factorInput: string,
): PrinterOpResult {
  if (index < 0 || index >= printers.length) return { ok: false, error: { code: 'notFound' } }
  const nameError = validateName(printers, name, index)
  if (nameError) return { ok: false, error: nameError }
  const factor = validateFactor(factorInput)
  if (factor === null) {
    return { ok: false, error: { code: 'factorInvalid' } }
  }
  const next = printers.slice()
  next[index] = { name: normalizeName(name), extrapolationFactor: factor }
  return { ok: true, printers: next }
}

export function deletePrinter(printers: Printer[], index: number): Printer[] {
  return printers.filter((_, i) => i !== index)
}

// Quad overwrite path: replace the factor for a matching profile, else append.
// This is the only place a duplicate name is allowed.
export function upsertPrinter(printers: Printer[], name: string, factor: number): Printer[] {
  const trimmed = normalizeName(name)
  const index = printers.findIndex((printer) => namesMatch(printer.name, trimmed))
  if (index >= 0) {
    const next = printers.slice()
    next[index] = { ...next[index], extrapolationFactor: factor }
    return next
  }
  return [...printers, { name: trimmed, extrapolationFactor: factor }]
}

export function hasNameConflict(printers: Printer[], name: string): boolean {
  return printers.some((printer) => namesMatch(printer.name, name))
}

export function exportJSON(printers: Printer[]): string {
  return JSON.stringify({ version: EXPORT_VERSION, printers }, null, 2)
}

export type ImportResult =
  | { ok: true; printers: Printer[]; skipped: string[] }
  | { ok: false; error: PrinterError }

export function importJSON(current: Printer[], text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: { code: 'invalidJson' } }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: { code: 'notExportObject' } }
  }
  const record = parsed as { version?: unknown; printers?: unknown }
  if (record.version !== EXPORT_VERSION) {
    return { ok: false, error: { code: 'unsupportedVersion', expected: EXPORT_VERSION } }
  }
  if (!Array.isArray(record.printers)) {
    return { ok: false, error: { code: 'printersList' } }
  }

  const imported: Printer[] = []
  for (const entry of record.printers) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      return { ok: false, error: { code: 'entryNotObject' } }
    }
    const { name, extrapolationFactor } = entry as { name?: unknown; extrapolationFactor?: unknown }
    if (typeof name !== 'string' || !normalizeName(name)) {
      return { ok: false, error: { code: 'entryNameEmpty' } }
    }
    if (
      typeof extrapolationFactor !== 'number' ||
      !Number.isFinite(extrapolationFactor) ||
      extrapolationFactor <= 0
    ) {
      return { ok: false, error: { code: 'entryFactorInvalid', name: normalizeName(name) } }
    }
    if (imported.some((printer) => namesMatch(printer.name, name))) {
      return { ok: false, error: { code: 'duplicateInFile', name: normalizeName(name) } }
    }
    imported.push({ name: normalizeName(name), extrapolationFactor })
  }

  const skipped: string[] = []
  const merged = current.slice()
  for (const printer of imported) {
    if (merged.some((existing) => namesMatch(existing.name, printer.name))) {
      skipped.push(printer.name)
    } else {
      merged.push(printer)
    }
  }
  return { ok: true, printers: merged, skipped }
}
