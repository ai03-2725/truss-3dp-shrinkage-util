import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  average,
  beamHasGapWarning,
  calcPrinterFactor,
  calcQuadShrinkage,
  calcRecommendedXYPercent,
  calcSingleShrinkage,
  formatPercent,
  formatShrinkage,
  isFactorOutOfRange,
  isGapWarning,
  isLengthOutOfRange,
  isPercentOutOfRange,
  namesMatch,
  normalizeName,
  parsePositiveDecimal,
  quadAverage,
  xAverage,
} from './calc.ts'

test('input parsing accepts positive period decimals and rejects invalid input', () => {
  assert.equal(parsePositiveDecimal('140.25'), 140.25)
  assert.equal(parsePositiveDecimal(' 12 '), 12)
  assert.equal(parsePositiveDecimal('.5'), 0.5)
  assert.equal(parsePositiveDecimal('5.'), 5)
  assert.equal(parsePositiveDecimal('0.0000001'), 0.0000001)

  for (const bad of ['', '   ', 'abc', '0', '-1', '1,5', '1.2.3', '+1', 'Infinity', 'NaN']) {
    assert.equal(parsePositiveDecimal(bad), null, `${bad} should be rejected`)
  }
})

test('quad and single math matches the PRD formulas', () => {
  assert.equal(average([1, 2, 3, 4]), 2.5)
  assert.equal(quadAverage([1, 2, 3, 4, 5, 6, 7, 8]), 4.5)
  assert.equal(xAverage(140.2, 140.0), 140.1)
  assert.equal(calcPrinterFactor(4.5, 1.5), 3)
  assert.equal(calcQuadShrinkage(140), 1)
  assert.equal(calcQuadShrinkage(138.6), 0.99)
  assert.equal(calcSingleShrinkage(140, 1.002), 1.002)
  assert.equal(calcRecommendedXYPercent(100, 0.987), 98.7)
})

test('end-to-end quad then single reuses the saved full-precision factor', () => {
  const readings = [140.21, 140.05, 140.33, 140.11, 139.87, 140.02, 140.09, 139.95]
  const quad = quadAverage(readings)
  const x = xAverage(readings[0], readings[1])
  const factor = calcPrinterFactor(quad, x)

  const quadShrinkage = calcQuadShrinkage(quad)
  const singleShrinkage = calcSingleShrinkage(x, factor)
  assert.ok(Math.abs(singleShrinkage - quadShrinkage) < 1e-12)
  assert.equal(calcRecommendedXYPercent(100, quadShrinkage), quadShrinkage * 100)
})

test('display rounds shrinkage to 10 decimals and percent to 4, dropping trailing zeros', () => {
  assert.equal(formatShrinkage(0.98765432109876), '0.9876543211')
  assert.equal(formatShrinkage(0.95), '0.95')
  assert.equal(formatShrinkage(1), '1')
  assert.equal(formatShrinkage(138.6 / 140), '0.99')
  assert.equal(formatPercent(98.7), '98.7')
  assert.equal(formatPercent(98.712345), '98.7123')
  assert.equal(formatPercent(100), '100')
})

test('length range warning boundaries', () => {
  assert.equal(isLengthOutOfRange(135), false)
  assert.equal(isLengthOutOfRange(142), false)
  assert.equal(isLengthOutOfRange(134.999), true)
  assert.equal(isLengthOutOfRange(142.001), true)
})

test('per-beam gap warns only above 0.4 mm', () => {
  assert.equal(isGapWarning(100, 100.4), false)
  assert.equal(isGapWarning(100.4, 100), false)
  assert.equal(isGapWarning(100, 100.4001), true)
  assert.equal(isGapWarning(100.5, 100), true)
  assert.equal(beamHasGapWarning({ outer: '140', inner: '140.4' }), false)
  assert.equal(beamHasGapWarning({ outer: '140', inner: '140.5' }), true)
  assert.equal(beamHasGapWarning({ outer: '', inner: '140.5' }), false)
})

test('percentage and factor warning boundaries', () => {
  assert.equal(isPercentOutOfRange(90), false)
  assert.equal(isPercentOutOfRange(110), false)
  assert.equal(isPercentOutOfRange(89.9), true)
  assert.equal(isPercentOutOfRange(110.1), true)

  assert.equal(isFactorOutOfRange(0.9), false)
  assert.equal(isFactorOutOfRange(1.1), false)
  assert.equal(isFactorOutOfRange(0.8999), true)
  assert.equal(isFactorOutOfRange(1.1001), true)
})

test('name normalisation trims and matches case-insensitively', () => {
  assert.equal(normalizeName('  P1S '), 'P1S')
  assert.equal(namesMatch('p1s', ' P1S '), true)
  assert.equal(namesMatch('p1s', 'p1s-2'), false)
})
