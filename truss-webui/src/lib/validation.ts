import {
  FACTOR_WARN_MAX,
  FACTOR_WARN_MIN,
  WARN_MAX_MM,
  WARN_MIN_MM,
} from './constants'

export const MEASUREMENT_WARNING =
  'Your entered value is quite far from the expected 140mm target - please ensure that you are measuring the part correctly.'

export const FACTOR_WARNING =
  'This extrapolation factor is outside the expected 0.9–1.1 range - please double-check the measured values.'

export const DUPLICATE_NAME_ERROR = 'A printer with this name already exists.'

export const NAME_EMPTY_ERROR = 'Please enter a printer name.'
export const NAME_TOO_LONG_ERROR =
  'Printer names must be 64 characters or fewer.'

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

/** Positive finite measurement; soft warning outside 135–142mm. PRD §14. */
export function validateMeasurement(raw: string): {
  valid: boolean
  warn: boolean
} {
  const value = parseNumber(raw)
  if (value === null || value <= 0) return { valid: false, warn: false }
  const warn = value < WARN_MIN_MM || value > WARN_MAX_MM
  return { valid: true, warn }
}

/** Percent >0 and ≤1000. PRD §14. */
export function validatePercent(raw: string): boolean {
  const value = parseNumber(raw)
  return value !== null && value > 0 && value <= 1000
}

/** Trimmed non-empty, ≤64 chars, case-insensitive unique. PRD §14. */
export function validatePrinterName(
  raw: string,
  existingNames: string[],
  currentName?: string,
): { valid: boolean; error?: string } {
  const name = raw.trim()
  if (name === '') return { valid: false, error: NAME_EMPTY_ERROR }
  if (name.length > 64) return { valid: false, error: NAME_TOO_LONG_ERROR }
  const lower = name.toLowerCase()
  const current = currentName?.trim().toLowerCase()
  const conflict = existingNames.some(
    (existing) =>
      existing.toLowerCase() === lower && existing.toLowerCase() !== current,
  )
  if (conflict) return { valid: false, error: DUPLICATE_NAME_ERROR }
  return { valid: true }
}

/** Positive finite factor; soft warning outside 0.9–1.1. PRD §14. */
export function validateFactor(raw: string): { valid: boolean; warn: boolean } {
  const value = parseNumber(raw)
  if (value === null || value <= 0) return { valid: false, warn: false }
  const warn = value < FACTOR_WARN_MIN || value > FACTOR_WARN_MAX
  return { valid: true, warn }
}
