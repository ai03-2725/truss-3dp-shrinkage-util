// Printer profile operations and versioned JSON portability.
// Pure list-in / list-out (or result) functions with no browser or UI coupling.

import type { Printer } from './types.ts'
import { namesMatch, normalizeName, parsePositiveDecimal } from './calc.ts'

export const EXPORT_VERSION = 1

export type PrinterOpResult =
  | { ok: true; printers: Printer[] }
  | { ok: false; error: string }

function validateName(printers: Printer[], name: string, ignoreIndex = -1): string | null {
  const trimmed = normalizeName(name)
  if (!trimmed) return 'Printer name is required.'
  if (printers.some((printer, index) => index !== ignoreIndex && namesMatch(printer.name, trimmed))) {
    return `A printer named “${trimmed}” already exists.`
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
    return { ok: false, error: 'Enter a finite, positive extrapolation factor.' }
  }
  return { ok: true, printers: [...printers, { name: normalizeName(name), extrapolationFactor: factor }] }
}

export function editPrinter(
  printers: Printer[],
  index: number,
  name: string,
  factorInput: string,
): PrinterOpResult {
  if (index < 0 || index >= printers.length) return { ok: false, error: 'Printer not found.' }
  const nameError = validateName(printers, name, index)
  if (nameError) return { ok: false, error: nameError }
  const factor = validateFactor(factorInput)
  if (factor === null) {
    return { ok: false, error: 'Enter a finite, positive extrapolation factor.' }
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
  | { ok: false; error: string }

export function importJSON(current: Printer[], text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'The file must contain a printer export object.' }
  }
  const record = parsed as { version?: unknown; printers?: unknown }
  if (record.version !== EXPORT_VERSION) {
    return { ok: false, error: `Unsupported file version. Expected version ${EXPORT_VERSION}.` }
  }
  if (!Array.isArray(record.printers)) {
    return { ok: false, error: 'The file must contain a list of printers.' }
  }

  const imported: Printer[] = []
  for (const entry of record.printers) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      return { ok: false, error: 'Every printer entry must be an object.' }
    }
    const { name, extrapolationFactor } = entry as { name?: unknown; extrapolationFactor?: unknown }
    if (typeof name !== 'string' || !normalizeName(name)) {
      return { ok: false, error: 'Every printer entry needs a non-empty name.' }
    }
    if (
      typeof extrapolationFactor !== 'number' ||
      !Number.isFinite(extrapolationFactor) ||
      extrapolationFactor <= 0
    ) {
      return { ok: false, error: `“${normalizeName(name)}” has an invalid extrapolation factor.` }
    }
    if (imported.some((printer) => namesMatch(printer.name, name))) {
      return { ok: false, error: `The file contains duplicate printer name “${normalizeName(name)}”.` }
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
