import { describe, expect, it } from 'vitest'
import {
  formatFactor,
  formatMeasurement,
  formatPercent,
  formatRatio,
  parseNumber,
  roundHalfUp,
} from './number'

describe('roundHalfUp', () => {
  /*
   * The PRD's tie fixture (§14.1, fixture B). 137.4625 / 140 is exactly
   * 0.981875 decimal, so this is a true half-way case at 5dp and pins the rule:
   * truncation would give 0.98187, half-up gives 0.98188.
   */
  it('rounds the fixture B tie up', () => {
    expect(roundHalfUp(0.981875, 5)).toBe(0.98188)
  })

  it('rounds other exact ties away from zero', () => {
    expect(roundHalfUp(0.5, 0)).toBe(1)
    expect(roundHalfUp(1.5, 0)).toBe(2)
    expect(roundHalfUp(2.25, 1)).toBe(2.3)
    expect(roundHalfUp(0.125, 2)).toBe(0.13)
  })

  it('rounds negative ties away from zero, so the rule has no sign bias', () => {
    expect(roundHalfUp(-0.5, 0)).toBe(-1)
    expect(roundHalfUp(-2.25, 1)).toBe(-2.3)
    expect(roundHalfUp(-1.005, 2)).toBe(-1.01)
  })

  /*
   * The float trap the PRD calls out explicitly. The nearest double to 1.005 is
   * 1.00499999999999989..., so `1.005 * 100` is 100.49999999999999 and a
   * multiply-then-round implementation gets this wrong. 2.675 and 8.475 are the
   * same trap reached through different binaries.
   */
  it('handles the 1.005 float trap the way a decimal calculator would', () => {
    expect(roundHalfUp(1.005, 2)).toBe(1.01)
    expect(roundHalfUp(2.675, 2)).toBe(2.68)
    expect(roundHalfUp(8.475, 2)).toBe(8.48)
    expect(roundHalfUp(9.935, 2)).toBe(9.94)
  })

  it('leaves values that need no rounding untouched', () => {
    expect(roundHalfUp(137.5, 10)).toBe(137.5)
    expect(roundHalfUp(0.9997272727, 10)).toBe(0.9997272727)
    expect(roundHalfUp(0, 5)).toBe(0)
    // Negative zero normalises to positive zero: the sign lives in the decimal
    // string, and "-0" has no sign to carry. Nothing downstream distinguishes
    // them, and a displayed "-0.00" would be worse than the normalisation.
    expect(Object.is(roundHalfUp(-0, 5), 0)).toBe(true)
  })

  it('passes non-finite values through instead of throwing', () => {
    expect(Number.isNaN(roundHalfUp(Number.NaN, 5))).toBe(true)
    expect(roundHalfUp(Number.POSITIVE_INFINITY, 5)).toBe(Number.POSITIVE_INFINITY)
    expect(roundHalfUp(Number.NEGATIVE_INFINITY, 5)).toBe(Number.NEGATIVE_INFINITY)
  })

  it('rejects a nonsensical places argument loudly', () => {
    expect(() => roundHalfUp(1, -1)).toThrow(RangeError)
    expect(() => roundHalfUp(1, 1.5)).toThrow(RangeError)
  })

  it('survives extreme magnitudes', () => {
    // Beyond double precision: the requested places are not representable, so
    // the value must come back unchanged rather than as NaN or Infinity.
    expect(roundHalfUp(1e21, 2)).toBe(1e21)
    expect(roundHalfUp(5e-7, 3)).toBe(0)
    expect(roundHalfUp(5e-7, 10)).toBe(5e-7)
    expect(roundHalfUp(1e-21, 10)).toBe(0)
  })
})

describe('display formatters', () => {
  it('pads to a fixed number of places so digit count never shifts', () => {
    expect(formatFactor(1)).toBe('1.0000000000')
    expect(formatRatio(0.981875)).toBe('0.98188')
    expect(formatPercent(98.1875)).toBe('98.188')
    expect(formatMeasurement(137.5)).toBe('137.50')
  })

  it('matches the PRD worked fixtures', () => {
    // Fixture A: a degenerate quad yields F = 1 and R = 137.5/140.
    expect(formatRatio(137.5 / 140)).toBe('0.98214')
    expect(formatPercent((137.5 / 140) * 100)).toBe('98.214')

    // Fixture B: F = 137.4625 / 137.5, R = 137.4625 / 140.
    expect(formatFactor(137.4625 / 137.5)).toBe('0.9997272727')
    expect(formatRatio(137.4625 / 140)).toBe('0.98188')
    expect(formatPercent((137.4625 / 140) * 100)).toBe('98.188')
  })

  it('does not derive the percentage from the rounded ratio', () => {
    // 0.98187 * 100 (truncated ratio) would display 98.187; the full-precision
    // ratio must produce 98.188. This is the regression the PRD warns about.
    expect(formatPercent((137.4625 / 140) * 100)).not.toBe('98.187')
  })

  it('renders non-finite values as text rather than throwing', () => {
    expect(formatFactor(Number.NaN)).toBe('NaN')
    expect(formatRatio(Number.POSITIVE_INFINITY)).toBe('Infinity')
  })
})

describe('parseNumber', () => {
  it('accepts complete decimals with a point', () => {
    expect(parseNumber('137.5')).toEqual({ ok: true, value: 137.5 })
    expect(parseNumber('137')).toEqual({ ok: true, value: 137 })
    expect(parseNumber('0.01')).toEqual({ ok: true, value: 0.01 })
  })

  it('accepts a comma as the decimal separator', () => {
    expect(parseNumber('137,5')).toEqual({ ok: true, value: 137.5 })
    expect(parseNumber(',5')).toEqual({ ok: true, value: 0.5 })
  })

  it('accepts a leading sign so that negatives reach validation with a real value', () => {
    expect(parseNumber('-3')).toEqual({ ok: true, value: -3 })
    expect(parseNumber('+3.5')).toEqual({ ok: true, value: 3.5 })
  })

  it('trims surrounding whitespace but rejects interior whitespace', () => {
    expect(parseNumber('  137.5  ')).toEqual({ ok: true, value: 137.5 })
    expect(parseNumber('13 7,5').ok).toBe(false)
  })

  it('rejects empty input as its own reason', () => {
    expect(parseNumber('')).toEqual({ ok: false, error: { code: 'empty', text: '' } })
    expect(parseNumber('   ')).toEqual({ ok: false, error: { code: 'empty', text: '   ' } })
  })

  it('rejects half-typed values as incomplete rather than as errors', () => {
    for (const text of ['5.', '5,', '.', '-']) {
      expect(parseNumber(text)).toEqual({ ok: false, error: { code: 'incomplete', text } })
      // Still not a number — the gate blocks — but the field does not shout at
      // the user for the crime of typing `137.` on the way to `137.5`.
      expect(parseNumber(text).ok).toBe(false)
    }
  })

  it('rejects garbage and number-ish strings that are not decimals', () => {
    for (const text of ['abc', '13a', '1.2.3', '1,2.3', '1e3', 'NaN', 'Infinity', '0x10', '١٢٣']) {
      expect(parseNumber(text)).toEqual({ ok: false, error: { code: 'malformed', text } })
    }
  })

  it('reads an ambiguous 1,234 as a comma decimal rather than guessing thousands', () => {
    // Documented consequence: the implausible value is caught by the range
    // warning (PRD §8.3) rather than by refusing every comma outright.
    expect(parseNumber('1,234')).toEqual({ ok: true, value: 1.234 })
  })
})
