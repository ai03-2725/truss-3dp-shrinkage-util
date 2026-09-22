import {
  FACTOR_WARN_MAX,
  FACTOR_WARN_MIN,
  WARN_MAX_MM,
  WARN_MIN_MM,
} from './constants'

/** Exact user-facing warning/error strings (PRD §14). */
export const MEASUREMENT_RANGE_WARNING =
  'Your entered value is quite far from the expected 140mm target - please ensure that you are measuring the part correctly.'
export const FACTOR_RANGE_WARNING =
  'This extrapolation factor is outside the expected range of 0.9 to 1.1 - please double-check it.'
export const DUPLICATE_NAME_ERROR = 'A printer with this name already exists.'
export const EMPTY_NAME_ERROR = 'Please enter a name.'
export const LONG_NAME_ERROR = 'Printer names must be 64 characters or fewer.'
export const INVALID_MEASUREMENT_ERROR = 'Enter a positive number.'

const MAX_NAME_LENGTH = 64

/** Parse a user-entered number; returns null for empty/non-numeric input. */
export function parseNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

export interface MeasurementValidation {
  valid: boolean
  warn: boolean
}

/** Positive finite measurement; soft warning outside the expected range. */
export function validateMeasurement(raw: string): MeasurementValidation {
  const value = parseNumber(raw)
  if (value === null || value <= 0) return { valid: false, warn: false }
  return { valid: true, warn: value < WARN_MIN_MM || value > WARN_MAX_MM }
}

/** Slicer current XY percentage: > 0 and ≤ 1000. */
export function validatePercent(raw: string): boolean {
  const value = parseNumber(raw)
  return value !== null && value > 0 && value <= 1000
}

export interface NameValidation {
  valid: boolean
  error?: string
}

/**
 * Printer name: trimmed non-empty, ≤ 64 chars, case-insensitive uniqueness
 * excluding the record currently being edited.
 */
export function validatePrinterName(
  raw: string,
  existingNames: string[],
  currentName?: string,
): NameValidation {
  const name = raw.trim()
  if (name === '') return { valid: false, error: EMPTY_NAME_ERROR }
  if (name.length > MAX_NAME_LENGTH) {
    return { valid: false, error: LONG_NAME_ERROR }
  }
  const lower = name.toLowerCase()
  const currentLower = currentName?.trim().toLowerCase()
  const duplicate = existingNames.some((existing) => {
    const existingLower = existing.trim().toLowerCase()
    return existingLower === lower && existingLower !== currentLower
  })
  if (duplicate) return { valid: false, error: DUPLICATE_NAME_ERROR }
  return { valid: true }
}

export interface FactorValidation {
  valid: boolean
  warn: boolean
}

/** Required positive extrapolation factor; soft warning outside 0.9–1.1. */
export function validateFactor(raw: string): FactorValidation {
  const value = parseNumber(raw)
  if (value === null || value <= 0) return { valid: false, warn: false }
  return {
    valid: true,
    warn: value < FACTOR_WARN_MIN || value > FACTOR_WARN_MAX,
  }
}
