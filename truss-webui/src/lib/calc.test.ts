import { describe, expect, it } from 'vitest'
import {
  average,
  finalShrinkagePercent,
  format4dp,
  format5dp,
  quadCompensationRatio,
  quadExtrapolationFactor,
  singleExtrapolatedRatio,
} from './calc'
import { createEmptyMeasurements } from './constants'
import type { MeasurementState } from './types'

function measurements(
  values: Partial<Record<keyof MeasurementState, [number, number]>>,
): MeasurementState {
  const base = createEmptyMeasurements()
  for (const [axis, [outer, inner]] of Object.entries(values)) {
    base[axis as keyof MeasurementState] = { outer, inner }
  }
  return base
}

describe('average', () => {
  it('averages values', () => {
    expect(average([2, 4, 6])).toBe(4)
  })

  it('returns NaN for an empty list', () => {
    expect(Number.isNaN(average([]))).toBe(true)
  })
})

describe('quad formulas', () => {
  it('computes a zero-skew extrapolation factor of exactly 1', () => {
    const m = measurements({
      X: [140, 139.8],
      Y: [139.9, 139.7],
      A: [140.1, 139.9],
      B: [140, 139.8],
    })
    expect(quadExtrapolationFactor(m)).toBeCloseTo(1, 12)
  })

  it('computes the extrapolation factor for known inputs', () => {
    const m = measurements({
      X: [140, 140],
      Y: [139, 139],
      A: [139, 139],
      B: [139, 139],
    })
    // avg8 = 139.25; Xavg = 140
    expect(quadExtrapolationFactor(m)).toBeCloseTo(139.25 / 140, 12)
  })

  it('computes the quad compensation ratio', () => {
    const m = measurements({
      X: [140, 140],
      Y: [139, 139],
      A: [139, 139],
      B: [139, 139],
    })
    expect(quadCompensationRatio(m)).toBeCloseTo(139.25 / 140, 12)
  })
})

describe('single formula', () => {
  it('extrapolates the single-beam ratio', () => {
    expect(singleExtrapolatedRatio(139, 141, 1.02)).toBeCloseTo(1.02, 12)
  })

  it('applies the printer factor', () => {
    // avg 140 -> ratio 1.0 before factor
    expect(singleExtrapolatedRatio(140, 140, 0.99464)).toBeCloseTo(0.99464, 12)
  })
})

describe('final shrinkage', () => {
  it('multiplies current percent by the ratio', () => {
    expect(finalShrinkagePercent(100, 0.987)).toBeCloseTo(98.7, 12)
    expect(finalShrinkagePercent(105, 0.95)).toBeCloseTo(99.75, 12)
  })
})

describe('formatting', () => {
  it('rounds to 5 dp without trailing zeros', () => {
    expect(format5dp(0.994642857)).toBe('0.99464')
    expect(format5dp(0.987)).toBe('0.987')
    expect(format5dp(1)).toBe('1')
  })

  it('rounds to 4 dp without trailing zeros', () => {
    expect(format4dp(98.7654321)).toBe('98.7654')
    expect(format4dp(98.7)).toBe('98.7')
  })
})
