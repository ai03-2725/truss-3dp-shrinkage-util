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
 * - **Non-blocking warnings** — plausible-range, ordering, divergence. These are
 *   *judgements about a number that is perfectly usable*, so they never stop the
 *   user: they say "this is probably a misread, look again". A warning that
 *   blocked progression would be a validation error wearing the wrong label, and
 *   the first time it was wrong the user would have no way past it.
 *
 * The thresholds are settled in PRD §8.3/§13.2 and the reasoning lives there; the
 * constants are named here so the copy and the rules cannot drift apart.
 */

/** Documented shrinkage is 0.95–0.99 of the 140mm beam, i.e. 133–138.6mm. */
export const PLAUSIBLE_MIN_MM = 133
export const PLAUSIBLE_MAX_MM = 138.6

/**
 * The inner and outer readings differ by the sum of two end-wall thicknesses —
 * under 1mm in the shipped designs. Twice that is unreachable by a correctly
 * seated caliper, and comfortably above every legitimate reading.
 */
export const MAX_DIVERGENCE_MM = 2

export type MeasurementWarningKind = 'implausible-length' | 'inner-not-smaller' | 'divergence'

export interface MeasurementWarning {
  readonly kind: MeasurementWarningKind
  readonly message: string
}

function implausibleLength(value: number): MeasurementWarning {
  return {
    kind: 'implausible-length',
    message:
      `A ${value}mm reading is unlikely: the beam is designed to be ${DESIGNED_LENGTH_MM}mm and ` +
      'shrinkage is normally 0.95–0.99 of that (133–138.6mm). Check the calipers and the units.',
  }
}

const INNER_NOT_SMALLER: MeasurementWarning = {
  kind: 'inner-not-smaller',
  message:
    'The inner reading is not smaller than the outer one. Both measure the same beam, so this ' +
    'means one of them was read or seated incorrectly.',
}

function divergence(gap: number): MeasurementWarning {
  return {
    kind: 'divergence',
    message:
      `Outer and inner differ by ${gap.toFixed(2)}mm, which is more than this design can produce ` +
      `(${MAX_DIVERGENCE_MM}mm). The calipers are probably not seated against the support walls — ` +
      'check the correct/incorrect examples before continuing.',
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
 * Warnings for a completed axis: the ordering check and the divergence check.
 *
 * Both need both readings, so neither can be evaluated per-field — which is why
 * this takes the pair rather than one value.
 */
export function checkAxisPair(outer: number, inner: number): readonly MeasurementWarning[] {
  const warnings: MeasurementWarning[] = []

  if (inner >= outer) {
    warnings.push(INNER_NOT_SMALLER)
  } else if (outer - inner > MAX_DIVERGENCE_MM) {
    warnings.push(divergence(outer - inner))
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
 * Attribution matters: the ordering and divergence warnings are about the *pair*,
 * so they belong on whichever field the user is looking at, while an implausible
 * length belongs to the reading it describes. Both fields therefore show the pair
 * warnings, and each shows its own length warning.
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
