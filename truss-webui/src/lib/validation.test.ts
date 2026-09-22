import { describe, expect, it } from 'vitest'
import {
  DUPLICATE_NAME_ERROR,
  validateFactor,
  validateMeasurement,
  validatePercent,
  validatePrinterName,
} from './validation'

describe('measurement validation (PRD §14)', () => {
  it('rejects empty, zero, negative, and non-numeric values', () => {
    for (const raw of ['', '   ', '0', '-1', 'abc', 'NaN']) {
      expect(validateMeasurement(raw).valid).toBe(false)
    }
  })

  it('accepts positive values', () => {
    expect(validateMeasurement('139.9').valid).toBe(true)
  })

  it('warns only outside 135–142', () => {
    expect(validateMeasurement('134.99')).toMatchObject({
      valid: true,
      warn: true,
    })
    expect(validateMeasurement('135')).toMatchObject({
      valid: true,
      warn: false,
    })
    expect(validateMeasurement('142')).toMatchObject({
      valid: true,
      warn: false,
    })
    expect(validateMeasurement('142.01')).toMatchObject({
      valid: true,
      warn: true,
    })
  })
})

describe('percent validation (PRD §14)', () => {
  it('accepts percentages above 0 up to 1000', () => {
    expect(validatePercent('100')).toBe(true)
    expect(validatePercent('0.5')).toBe(true)
    expect(validatePercent('1000')).toBe(true)
  })

  it('rejects zero, negative, too large, and non-numeric', () => {
    for (const raw of ['0', '-5', '1000.1', 'abc', '']) {
      expect(validatePercent(raw)).toBe(false)
    }
  })
})

describe('printer name validation (PRD §14)', () => {
  const existing = ['Bambu P1S', 'Voron']

  it('requires a non-empty trimmed name', () => {
    expect(validatePrinterName('   ', existing).valid).toBe(false)
  })

  it('blocks case-insensitive duplicates', () => {
    const result = validatePrinterName('bambu p1s', existing)
    expect(result.valid).toBe(false)
    expect(result.error).toBe(DUPLICATE_NAME_ERROR)
  })

  it('allows the record being edited to keep its name', () => {
    expect(validatePrinterName('Bambu P1S', existing, 'Bambu P1S').valid).toBe(
      true,
    )
    expect(validatePrinterName('bambu p1s', existing, 'BAMBU P1S').valid).toBe(
      true,
    )
  })

  it('rejects names longer than 64 characters', () => {
    expect(validatePrinterName('a'.repeat(65), existing).valid).toBe(false)
    expect(validatePrinterName('a'.repeat(64), existing).valid).toBe(true)
  })
})

describe('factor validation (PRD §14)', () => {
  it('requires a positive number', () => {
    expect(validateFactor('').valid).toBe(false)
    expect(validateFactor('0').valid).toBe(false)
    expect(validateFactor('-1').valid).toBe(false)
  })

  it('warns outside 0.9–1.1', () => {
    expect(validateFactor('0.89')).toMatchObject({ valid: true, warn: true })
    expect(validateFactor('0.9')).toMatchObject({ valid: true, warn: false })
    expect(validateFactor('1.1')).toMatchObject({ valid: true, warn: false })
    expect(validateFactor('1.11')).toMatchObject({ valid: true, warn: true })
  })
})
