import { describe, expect, it } from 'vitest'
import { createDraft, setMeasurement, type CalibrationDraft } from './draft'
import {
  applyCurrentSlicerValue,
  average,
  evaluateQuad,
  evaluateSingle,
  meanOfPairs,
  pairAverage,
  quadBasis,
  quadBasisFromPairs,
  quadFactor,
  quadFactorFromPairs,
  quadRatio,
  readMeasurements,
  singleExtrapolatedAverage,
  singleRatio,
} from './math'
import { AXES, type AxisId, type AxisPair } from './types'

/**
 * Golden fixtures from PRD §14.1.
 *
 * Every expected value below is **hand-computed in the comment above it**,
 * independently of the implementation. That is the whole point: a mis-averaged
 * or mis-extrapolated step still yields a plausible number near 0.98, so a test
 * that re-asserts the implementation's own arithmetic proves nothing.
 */

/** Fixture A — degenerate quad: every one of the eight readings is 137.50. */
const FIXTURE_A: Readonly<Record<AxisId, readonly [number, number]>> = {
  X: [137.5, 137.5],
  Y: [137.5, 137.5],
  A: [137.5, 137.5],
  B: [137.5, 137.5],
}

/** Fixture B — non-trivial factor; also the rounding-tie case. */
const FIXTURE_B: Readonly<Record<AxisId, readonly [number, number]>> = {
  X: [138.0, 137.0],
  Y: [137.0, 136.5],
  A: [138.2, 138.0],
  B: [137.6, 137.4],
}

function draftWith(
  flow: 'quad' | 'single',
  readings: Partial<Record<AxisId, readonly [number, number]>>,
): CalibrationDraft {
  let draft = createDraft(flow)
  for (const axis of AXES) {
    const pair = readings[axis]
    if (pair === undefined) continue
    draft = setMeasurement(draft, axis, 'outer', String(pair[0]))
    draft = setMeasurement(draft, axis, 'inner', String(pair[1]))
  }
  return draft
}

/* -------------------------------------------------------------------------- */
/* Fixture A                                                                   */
/* -------------------------------------------------------------------------- */

describe('fixture A — degenerate quad', () => {
  /*
   * All eight readings are 137.50.
   *   v̄8 = 8 × 137.50 / 8            = 137.50
   *   v̄X = (137.50 + 137.50) / 2     = 137.50
   *   F  = v̄8 / v̄X                   = 1.0 exactly
   *   R  = 137.50 / 140               = 0.982142857142857… → 5dp 0.98214
   *   at 100%: 98.214285714…         → 3dp 98.214
   */
  const outcome = evaluateQuad(draftWith('quad', FIXTURE_A))

  it('computes the factor as exactly 1', () => {
    expect(outcome).not.toBeNull()
    expect(outcome?.factor).toBe(1)
    expect(outcome?.display.factor).toBe('1.0000000000')
  })

  it('computes 137.50 / 140 and rounds it up-free at 5dp', () => {
    expect(outcome?.ratio).toBeCloseTo(0.982142857142857, 15)
    expect(outcome?.display.ratio).toBe('0.98214')
  })

  it('yields 98.214% at a current slicer value of 100', () => {
    const percent = applyCurrentSlicerValue(100, outcome!.ratio)
    expect(percent).toBeCloseTo(98.21428571428571, 12)
    expect(percent.toFixed(3)).toBe('98.214')
  })
})

/* -------------------------------------------------------------------------- */
/* Fixture B                                                                   */
/* -------------------------------------------------------------------------- */

describe('fixture B — non-trivial factor and the rounding tie', () => {
  /*
   * Readings, in AXES order (outer, inner):
   *   X 138.00 / 137.00 · Y 137.00 / 136.50 · A 138.20 / 138.00 · B 137.60 / 137.40
   *
   *   sum  = 138.00 + 137.00 + 137.00 + 136.50 + 138.20 + 138.00 + 137.60 + 137.40
   *        = 1099.70
   *   v̄8  = 1099.70 / 8              = 137.4625
   *   v̄X  = (138.00 + 137.00) / 2    = 137.50
   *   F   = 137.4625 / 137.50         = 0.999727272727… → 10dp 0.9997272727
   *   R   = 137.4625 / 140            = 0.981875 *exactly* → the tie case:
   *                                     half-up gives 0.98188, truncation 0.98187
   *   at 100%: 98.1875%               → 3dp 98.188
   */
  const outcome = evaluateQuad(draftWith('quad', FIXTURE_B))

  it('sums and averages all eight readings', () => {
    expect(outcome?.mean).toBeCloseTo(137.4625, 12)
    expect(outcome?.display.mean).toBe('137.46')
  })

  it('uses only the X pair for the basis', () => {
    expect(outcome?.basis).toBe(137.5)
  })

  it('computes the extrapolation factor and rounds it to 10dp', () => {
    expect(outcome?.factor).toBeCloseTo(137.4625 / 137.5, 15)
    expect(outcome?.display.factor).toBe('0.9997272727')
  })

  it('rounds the tie up to 0.98188, which pins the half-up rule', () => {
    expect(outcome?.ratio).toBeCloseTo(0.981875, 15)
    expect(outcome?.display.ratio).toBe('0.98188')
    expect(outcome?.display.ratio).not.toBe('0.98187')
  })

  it('yields 98.188% at a current slicer value of 100', () => {
    const percent = applyCurrentSlicerValue(100, outcome!.ratio)
    expect(percent.toFixed(3)).toBe('98.188')
    expect(percent.toFixed(2)).toBe('98.19')
  })
})

/* -------------------------------------------------------------------------- */
/* Fixture C — cross-flow equivalence                                          */
/* -------------------------------------------------------------------------- */

describe('fixture C — the single flow reproduces the quad flow', () => {
  /*
   * Fixture B's printer, used on a single-beam print measured 137.60 / 137.40 —
   * deliberately the same average as Fixture B's X pair.
   *
   *   v̄2              = (137.60 + 137.40) / 2 = 137.50  (= Fixture B's v̄X)
   *   v̄extrapolated   = 137.50 × F
   *   R                = 137.50 × F / 140
   *
   * With F at the full precision stored by the app, `137.50 × F` is Fixture B's
   * `v̄8` to the last bit, so R is the same double: 0.981875 → 0.98188.
   *
   * The factor is taken from the quad outcome rather than from the 10dp string,
   * because PRD §7 stores and computes with full precision; the 10dp form exists
   * only to be displayed.
   */
  const quad = evaluateQuad(draftWith('quad', FIXTURE_B))!
  const single = evaluateSingle(draftWith('single', { X: [137.6, 137.4] }), quad.factor)!

  it('averages only the two readings', () => {
    expect(single.mean).toBe(137.5)
    expect(single.display.mean).toBe('137.50')
  })

  it('extrapolates the two-value average by the stored factor', () => {
    expect(single.extrapolatedAverage).toBeCloseTo(137.4625, 12)
    expect(single.factor).toBe(quad.factor)
  })

  it('reproduces the quad flow ratio exactly', () => {
    expect(single.ratio).toBe(quad.ratio)
    expect(single.display.ratio).toBe('0.98188')
  })

  it('produces the same slicer-ready percentage as the quad flow', () => {
    const fromQuad = applyCurrentSlicerValue(100, quad.ratio)
    const fromSingle = applyCurrentSlicerValue(100, single.ratio)
    expect(fromSingle).toBe(fromQuad)
    expect(fromSingle.toFixed(3)).toBe('98.188')
  })

  /*
   * The transcription path, exercised honestly: a user who skipped saving (or
   * hit unavailable storage) can only copy the factor *as displayed*, at 10dp.
   * The ratio that follows lands within a whisker of the tie and may display its
   * last digit differently. That is a documented, quantified consequence of the
   * display rounding — not a correctness failure of the extrapolation model.
   */
  it('stays within the last displayed digit when the factor is transcribed from its 10dp display', () => {
    const transcribed = Number(quad.display.factor)
    const ratio = singleRatio({ axis: 'X', outer: 137.6, inner: 137.4 }, transcribed)

    expect(Math.abs(ratio - quad.ratio) / quad.ratio).toBeLessThan(1e-9)
  })
})

/* -------------------------------------------------------------------------- */
/* Property test generalising Fixture C (T06.5)                                */
/* -------------------------------------------------------------------------- */

/** Deterministic PRNG, so a failure is reproducible rather than a flake. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('cross-flow equivalence property', () => {
  it('holds for randomly generated quad calibrations', () => {
    const random = mulberry32(0x7a1155)
    /** Plausible caliper readings: 133–139mm, inner a little under outer. */
    const reading = () => 133 + random() * 6
    const pair = (): AxisPair => {
      const outer = reading()
      return { axis: 'X', outer, inner: outer - 0.2 - random() * 1.6 }
    }

    for (let iteration = 0; iteration < 250; iteration += 1) {
      const pairs: AxisPair[] = AXES.map((axis) => ({ ...pair(), axis }))
      const factor = quadFactorFromPairs(pairs)
      const quadRatio = meanOfPairs(pairs) / 140

      // The single-flow basis is chosen to equal this calibration's X average,
      // which is precisely the condition under which the two must agree.
      const basis = quadBasisFromPairs(pairs)
      const single = singleRatio({ axis: 'X', outer: basis, inner: basis }, factor)

      expect(Math.abs(single - quadRatio) / quadRatio).toBeLessThan(1e-12)
    }
  })
})

/* -------------------------------------------------------------------------- */
/* Reading drafts                                                              */
/* -------------------------------------------------------------------------- */

describe('readMeasurements', () => {
  it('reports every missing slot rather than averaging what is present', () => {
    const draft = setMeasurement(createDraft('quad'), 'X', 'outer', '137.5')
    const read = readMeasurements(draft, AXES)

    expect(read.ok).toBe(false)
    if (!read.ok) {
      expect(read.pending.map((slot) => `${slot.axis}.${slot.side}`)).toEqual([
        'X.inner',
        'Y.outer',
        'Y.inner',
        'A.outer',
        'A.inner',
        'B.outer',
        'B.inner',
      ])
    }
  })

  it('treats zero, negatives, garbage, and half-typed text as blocking', () => {
    let draft = createDraft('single')
    draft = setMeasurement(draft, 'X', 'outer', '0')
    draft = setMeasurement(draft, 'X', 'inner', '137.')

    const read = readMeasurements(draft, ['X'])
    expect(read.ok).toBe(false)
    if (!read.ok) {
      expect(read.pending).toEqual([
        { axis: 'X', side: 'outer', text: '0' },
        { axis: 'X', side: 'inner', text: '137.' },
      ])
    }
  })

  it('accepts a comma decimal and presents the values in axis-then-side order', () => {
    let draft = createDraft('single')
    draft = setMeasurement(draft, 'X', 'outer', '137,60')
    draft = setMeasurement(draft, 'X', 'inner', '137,40')

    const read = readMeasurements(draft, ['X'])
    expect(read.ok).toBe(true)
    if (read.ok) {
      expect(read.values).toEqual([137.6, 137.4])
      expect(read.pairs).toEqual([{ axis: 'X', outer: 137.6, inner: 137.4 }])
    }
  })

  it('does not confuse one axis with another', () => {
    // Distinguishable values per axis: averaging the wrong pair cannot pass.
    const readings: Record<AxisId, readonly [number, number]> = {
      X: [138.0, 137.0],
      Y: [137.0, 136.5],
      A: [138.2, 138.0],
      B: [137.6, 137.4],
    }
    const draft = draftWith('quad', readings)
    const read = readMeasurements(draft, AXES)

    expect(read.ok).toBe(true)
    if (read.ok) {
      expect(read.pairs.map((p) => pairAverage(p))).toEqual([137.5, 136.75, 138.1, 137.5])
      expect(quadBasisFromPairs(read.pairs)).toBe(137.5)
    }
  })
})

/* -------------------------------------------------------------------------- */
/* Draft-level entry points                                                    */
/* -------------------------------------------------------------------------- */

describe('draft-level entry points', () => {
  it('return null while any reading is incomplete', () => {
    const partial = setMeasurement(createDraft('quad'), 'X', 'outer', '137.5')
    expect(evaluateQuad(partial)).toBeNull()
    expect(quadBasis(partial)).toBeNull()
    expect(quadFactor(partial)).toBeNull()
    expect(quadRatio(partial)).toBeNull()
  })

  it('agree with the pair-level functions on a complete draft', () => {
    const draft = draftWith('quad', FIXTURE_B)
    const outcome = evaluateQuad(draft)!

    expect(quadBasis(draft)).toBe(outcome.basis)
    expect(quadFactor(draft)).toBe(outcome.factor)
    expect(quadRatio(draft)).toBe(outcome.ratio)
  })

  it('expose full precision next to the display strings from one call', () => {
    const outcome = evaluateQuad(draftWith('quad', FIXTURE_B))!

    // The strings are rounded; the numbers are not. Computing from the strings
    // would give 98.187 at 3dp, so they are demonstrably different objects.
    expect(outcome.display.ratio).toBe('0.98188')
    expect(applyCurrentSlicerValue(100, outcome.ratio).toFixed(3)).toBe('98.188')
    expect(applyCurrentSlicerValue(100, Number(outcome.display.ratio)).toFixed(3)).toBe('98.188')
    expect(outcome.ratio).not.toBe(Number(outcome.display.ratio))
  })
})

describe('the two algebraic formulations agree', () => {
  /*
   * PRD §8.1 notes the guides' phrasings are equivalent: `v̄8 / 140` and
   * `(v̄X / 140) × F`. The implementation uses the "extrapolated average first"
   * order everywhere; this pins that the other order would not have changed the
   * answer, so a future reader does not "simplify" one into the other and
   * silently change behaviour.
   */
  it('evaluates F × (basis / 140) to the same value as (F × basis) / 140', () => {
    const outcome = evaluateQuad(draftWith('quad', FIXTURE_B))!
    const alternative = outcome.factor * (outcome.basis / 140)

    expect(Math.abs(alternative - outcome.ratio) / outcome.ratio).toBeLessThan(1e-12)
  })
})

describe('singleExtrapolatedAverage', () => {
  it('multiplies the two-value average by the factor', () => {
    expect(
      singleExtrapolatedAverage({ axis: 'X', outer: 137.6, inner: 137.4 }, 1.0034215686),
    ).toBeCloseTo(137.5 * 1.0034215686, 12)
  })

  it('is a no-op for a factor of exactly 1', () => {
    expect(singleExtrapolatedAverage({ axis: 'X', outer: 137.5, inner: 137.5 }, 1)).toBe(137.5)
  })
})

describe('average', () => {
  it('is the arithmetic mean', () => {
    expect(average([1, 2, 3, 4])).toBe(2.5)
    expect(average([137.5])).toBe(137.5)
  })

  it('is order-independent, so axis order cannot change a result', () => {
    const values = [138.0, 137.0, 137.0, 136.5, 138.2, 138.0, 137.6, 137.4]
    expect(average(values)).toBeCloseTo(average([...values].reverse()), 12)
  })

  it('yields NaN rather than throwing on an empty list', () => {
    expect(Number.isNaN(average([]))).toBe(true)
  })
})
