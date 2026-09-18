import { DESIGNED_LENGTH_MM } from './types'
import { parseNumber } from './number'

/**
 * Measurement validation (PRD §8.3).
 *
 * Two tiers, and the distinction is the whole point:
 *
 * - **Blocking** — empty, non-numeric, ≤ 0, non-finite. Implemented by the
 *   reader in `math.ts`, because a value that is not a number cannot take part in
 *   arithmetic at all.
 * - **Non-blocking warnings** — plausible-range, divergence. These are
 *   *judgements about a number that is perfectly usable*, so they never stop the
 *   user: they say "this is probably a misread, look again". A warning that
 *   blocked progression would be a validation error wearing the wrong label, and
 *   the first time it was wrong the user would have no way past it.
 *
 * The thresholds are settled in PRD §8.3/§13.2 and the reasoning lives there; the
 * constants are named here so the copy and the rules cannot drift apart.
 */

/**
 * Documented shrinkage puts the reading just under the 140mm beam, so this band
 * is deliberately generous: it brackets the designed length and only objects to
 * readings that cannot plausibly be this print.
 */
export const PLAUSIBLE_MIN_MM = 132
export const PLAUSIBLE_MAX_MM = 142

/**
 * The inner and outer readings differ by the sum of two end-wall thicknesses —
 * under 1mm in the shipped designs. Twice that is unreachable by a correctly
 * seated caliper, and comfortably above every legitimate reading.
 */
export const MAX_DIVERGENCE_MM = 2

export type MeasurementWarningKind = 'implausible-length' | 'divergence'

export interface MeasurementWarning {
  readonly kind: MeasurementWarningKind
  readonly message: string
}

function implausibleLength(value: number): MeasurementWarning {
  return {
    kind: 'implausible-length',
    message:
      `A ${value}mm reading is unlikely: the beam is designed to be ${DESIGNED_LENGTH_MM}mm and ` +
      `measurements normally fall between ${PLAUSIBLE_MIN_MM} and ${PLAUSIBLE_MAX_MM}mm. ` +
      'Check the calipers and the units.',
  }
}

function divergence(gap: number): MeasurementWarning {
  return {
    kind: 'divergence',
    message:
      `Outer and inner differ by ${gap.toFixed(2)}mm, which is much more than the expected maximum deviation ` +
      `(${MAX_DIVERGENCE_MM}mm). Please ensure that the calipers are seated properly as per the example images, and that the printer is not excessively skewed.`,
  }
}

/**
 * Warnings for one reading on its own.
 *
 * `null` means "nothing to say", which is the common case; an empty array is
 * never returned so callers cannot confuse "no warnings" with "not checked".
 */
export function checkReading(value: number): MeasurementWarning | null {
  if (value < PLAUSIBLE_MIN_MM || value > PLAUSIBLE_MAX_MM) {
    return implausibleLength(value)
  }
  return null
}

/**
 * Warnings for a completed axis: the divergence check.
 *
 * The readings are deliberately not required to be ordered — the shipped designs
 * can measure the inner span as equal to or longer than the outer one — so only
 * the size of the gap between them is judged, in either direction.
 */
export function checkAxisPair(outer: number, inner: number): readonly MeasurementWarning[] {
  const warnings: MeasurementWarning[] = []

  /*
   * The *size* of the gap, not its sign.
   *
   * Because order is not evidence of anything (see above), an inner span 5mm
   * longer than the outer one is precisely the misread that an outer span 5mm
   * longer than the inner one is, and has to warn the same way. Comparing the
   * signed difference reported the first and silently accepted the second.
   */
  const gap = Math.abs(outer - inner)
  if (gap > MAX_DIVERGENCE_MM) {
    warnings.push(divergence(gap))
  }

  const implausible = checkReading(outer) ?? checkReading(inner)
  if (implausible !== null) {
    warnings.push(implausible)
  }

  return warnings
}

/**
 * Warnings to show on **one** field, given both typed values on that axis.
 *
 * Attribution matters: the divergence warning is about the *pair*, so it belongs
 * on whichever field the user is looking at, while an implausible length belongs
 * to the reading it describes. Both fields therefore show the pair warning, and
 * each shows its own length warning.
 *
 * A value that does not parse is ignored rather than reported: a half-typed
 * reading is the blocking tier's business, and inventing a warning for it would
 * double-report the same keystroke.
 */
export function fieldWarnings(
  text: string,
  outerText: string,
  innerText: string,
): readonly MeasurementWarning[] {
  const own = parseForWarning(text)
  const outer = parseForWarning(outerText)
  const inner = parseForWarning(innerText)

  const warnings: MeasurementWarning[] = []

  if (own !== null) {
    const length = checkReading(own)
    if (length !== null) {
      warnings.push(length)
    }
  }

  if (outer !== null && inner !== null) {
    for (const warning of checkAxisPair(outer, inner)) {
      // The length warnings are already attributed above; only the pair-specific
      // ones are added here, so one problem is never reported twice.
      if (warning.kind !== 'implausible-length') {
        warnings.push(warning)
      }
    }
  }

  return warnings
}

/** Parse for warning purposes only; `null` when the text is not a number yet. */
function parseForWarning(text: string): number | null {
  const parsed = parseNumber(text)
  return parsed.ok ? parsed.value : null
}
