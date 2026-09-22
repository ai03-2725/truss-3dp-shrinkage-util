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
import type { MeasurementState } from './types'

// X average 140, overall average 140.75 → factor 1.005357142857...
const measurements: MeasurementState = {
  XOuter: 130,
  XInner: 150,
  YOuter: 141,
  YInner: 141,
  AOuter: 141,
  AInner: 141,
  BOuter: 141,
  BInner: 141,
}

describe('calculations (PRD §13)', () => {
  it('averages values', () => {
    expect(average([1, 2, 3, 4])).toBe(2.5)
  })

  it('computes the quad extrapolation factor', () => {
    expect(quadExtrapolationFactor(measurements)).toBeCloseTo(140.75 / 140, 12)
  })

  it('returns ~1.0 for a zero-skew printer', () => {
    const zeroSkew: MeasurementState = {
      XOuter: 140,
      XInner: 140,
      YOuter: 140,
      YInner: 140,
      AOuter: 140,
      AInner: 140,
      BOuter: 140,
      BInner: 140,
    }
    expect(quadExtrapolationFactor(zeroSkew)).toBe(1)
  })

  it('computes the quad compensation ratio', () => {
    expect(quadCompensationRatio(measurements)).toBeCloseTo(140.75 / 140, 12)
  })

  it('computes the single extrapolated ratio', () => {
    expect(singleExtrapolatedRatio(139, 141, 1.02345)).toBeCloseTo(1.02345, 12)
  })

  it('computes the final shrinkage percentage', () => {
    expect(finalShrinkagePercent(100, 0.987)).toBeCloseTo(98.7, 12)
    expect(finalShrinkagePercent(95, 1.02)).toBeCloseTo(96.9, 12)
  })
})

describe('display formatters (PRD §13)', () => {
  it('rounds the factor/ratio to 5 dp', () => {
    expect(format5dp(140.75 / 140)).toBe('1.00536')
    expect(format5dp(0.987)).toBe('0.987')
    expect(format5dp(1)).toBe('1')
  })

  it('rounds the final value to 4 dp', () => {
    expect(format4dp(98.7)).toBe('98.7')
    expect(format4dp(100 * (140.75 / 140))).toBe('100.5357')
    expect(format4dp(98.7654321)).toBe('98.7654')
  })
})
