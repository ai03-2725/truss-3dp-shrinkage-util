import { describe, expect, it } from 'vitest'
import {
  checkAxisPair,
  checkReading,
  fieldWarnings,
  PLAUSIBLE_MAX_MM,
  PLAUSIBLE_MIN_MM,
} from './validation'

describe('the plausible measurement band', () => {
  /*
   * The band is inclusive at both ends: a reading that sits exactly on the
   * boundary is unusual enough to have been considered, and warning about it
   * would only teach the user to ignore the message.
   */
  it('accepts readings at and inside the boundaries', () => {
    for (const value of [PLAUSIBLE_MIN_MM, 137, PLAUSIBLE_MAX_MM]) {
      expect(checkReading(value)).toBeNull()
    }
  })

  it('warns just outside the boundaries', () => {
    expect(checkReading(PLAUSIBLE_MIN_MM - 0.1)?.kind).toBe('implausible-length')
    expect(checkReading(PLAUSIBLE_MAX_MM + 0.1)?.kind).toBe('implausible-length')
  })

  it('states the 132–142mm band rather than the old shrinkage range', () => {
    const message = checkReading(150)?.message ?? ''
    expect(message).toContain('132')
    expect(message).toContain('142')
    expect(message).not.toContain('0.95')
    expect(message).not.toContain('138.6')
  })

  it('does not let a warning block anything: an out-of-band pair still warns', () => {
    // 150 and 137 are both usable numbers; only the guidance changes.
    expect(fieldWarnings('150', '150', '137').length).toBeGreaterThan(0)
    expect(fieldWarnings('137', '137', '136.5')).toEqual([])
  })
})

describe('the divergence warning depends on the size of the gap, not its direction', () => {
  /*
   * Both spans are designed to the same nominal 140mm, and the end-wall offsets
   * in the design can leave the inner span equal to or longer than the outer one,
   * so *which* reading is the larger of the two is not evidence of a misread and
   * is never reported on its own. What is reported is a gap too wide for the
   * design — whichever way round the two readings were entered.
   */
  it('stays silent for gaps inside the design tolerance, in either order', () => {
    expect(fieldWarnings('140', '140', '140')).toEqual([])
    expect(fieldWarnings('139', '139', '140')).toEqual([])
    expect(checkAxisPair(139, 140)).toEqual([])
    expect(checkAxisPair(140, 139)).toEqual([])
  })

  it('warns about a wide gap whichever reading is the larger one', () => {
    // 140/137.5 and its reverse are the same misread seen from two directions.
    expect(checkAxisPair(140, 137.5).map((warning) => warning.kind)).toEqual(['divergence'])
    expect(checkAxisPair(137.5, 140).map((warning) => warning.kind)).toEqual(['divergence'])
  })

  it('reports the size of the gap rather than a signed difference', () => {
    const forward = checkAxisPair(140, 137.5)[0]
    const reversed = checkAxisPair(137.5, 140)[0]
    expect(reversed?.message).toBe(forward?.message)
    expect(forward?.message).toContain('2.50mm')
  })

  it('warns on the field being typed into when the pair is reversed', () => {
    // The reported bug, end to end: outer 135 / inner 140 is a 5mm gap and must
    // warn on the outer field, exactly as outer 140 / inner 135 does.
    expect(fieldWarnings('135', '135', '140').map((warning) => warning.kind)).toEqual([
      'divergence',
    ])
    expect(fieldWarnings('140', '140', '135').map((warning) => warning.kind)).toEqual([
      'divergence',
    ])
  })
})
