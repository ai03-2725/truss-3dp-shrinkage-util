import { describe, expect, it } from 'vitest'
import {
  DUPLICATE_NAME_ERROR,
  NAME_EMPTY_ERROR,
  NAME_TOO_LONG_ERROR,
  validateFactor,
  validateMeasurement,
  validatePercent,
  validatePrinterName,
} from './validation'

describe('validateMeasurement', () => {
  it('rejects empty, non-numeric, zero and negative', () => {
    for (const raw of ['', '   ', 'abc', '0', '-1', 'NaN']) {
      expect(validateMeasurement(raw).valid).toBe(false)
    }
  })

  it('accepts valid values in range without warning', () => {
    for (const raw of ['135', '140', '142']) {
      expect(validateMeasurement(raw)).toEqual({ valid: true, warn: false })
    }
  })

  it('warns on the exact boundaries', () => {
    expect(validateMeasurement('134.99')).toEqual({ valid: true, warn: true })
    expect(validateMeasurement('142.01')).toEqual({ valid: true, warn: true })
  })
})

describe('validatePercent', () => {
  it('accepts percentages >0 and <=1000', () => {
    expect(validatePercent('100')).toBe(true)
    expect(validatePercent('1')).toBe(true)
    expect(validatePercent('1000')).toBe(true)
  })

  it('rejects out-of-range and empty', () => {
    expect(validatePercent('0')).toBe(false)
    expect(validatePercent('-5')).toBe(false)
    expect(validatePercent('1000.1')).toBe(false)
    expect(validatePercent('')).toBe(false)
  })
})

describe('validatePrinterName', () => {
  it('rejects empty and over-long names', () => {
    expect(validatePrinterName('  ', []).error).toBe(NAME_EMPTY_ERROR)
    expect(validatePrinterName('a'.repeat(65), []).error).toBe(
      NAME_TOO_LONG_ERROR,
    )
  })

  it('rejects case-insensitive duplicates', () => {
    const existing = ['Bambu P1S']
    expect(validatePrinterName('bambu p1s', existing).valid).toBe(false)
    expect(validatePrinterName('bambu p1s', existing).error).toBe(
      DUPLICATE_NAME_ERROR,
    )
  })

  it('excludes the record being edited', () => {
    const existing = ['Bambu P1S']
    expect(validatePrinterName('Bambu P1S', existing, 'Bambu P1S').valid).toBe(
      true,
    )
  })

  it('accepts a novel name', () => {
    expect(validatePrinterName('Voron 2.4', ['Bambu P1S']).valid).toBe(true)
  })
})

describe('validateFactor', () => {
  it('rejects non-positive and non-numeric', () => {
    for (const raw of ['', '0', '-1', 'abc']) {
      expect(validateFactor(raw).valid).toBe(false)
    }
  })

  it('warns outside 0.9-1.1', () => {
    expect(validateFactor('0.9').warn).toBe(false)
    expect(validateFactor('1.1').warn).toBe(false)
    expect(validateFactor('0.89').warn).toBe(true)
    expect(validateFactor('1.11').warn).toBe(true)
  })
})
