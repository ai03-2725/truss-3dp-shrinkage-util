/**
 * Number rounding, formatting, and parsing (PRD §8.2).
 *
 * Two rules drive everything here:
 *
 * 1. **Display is rounded half-up, not truncated.** The outline said truncate;
 *    the PRD deliberately departs from it, because truncation biases every
 *    displayed value *downward* and the displayed value is what the user retypes
 *    into their slicer. "Half-up" has a sign convention: it rounds a tie *away
 *    from zero*, so the rule has no directional bias on either side of zero.
 * 2. **Rounded values are for display only.** Computation always uses the full
 *    float. Nothing in this module is ever fed back into the math.
 */

/** Display precision per value, from PRD §8.2 and §13.1. */
export const FACTOR_PLACES = 10
export const RATIO_PLACES = 5
/** Settled at 3dp in T03.1; see PRD §13.1 for the reasoning. */
export const PERCENT_PLACES = 3
/** Calipers read to 0.01mm, which is the most a measurement can honestly claim. */
export const MEASUREMENT_PLACES = 2

/**
 * Scale `value` by a power of ten *through its decimal representation*.
 *
 * This is the crux of correct half-up rounding, and it is why `toFixed` and a
 * naive `value * 10 ** places` are both wrong. `1.005` is not representable in
 * binary: the nearest double is `1.00499999999999989…`, so `1.005 * 100` is
 * `100.49999999999999` and rounds *down*, when the decimal the user wrote clearly
 * rounds up. Interpolating the exponent into the shortest decimal string instead
 * makes the parser round `100.5` to the nearest double — which is exactly
 * `100.5`, since it is representable — so the tie is preserved and rounds up.
 */
function shiftExponent(value: number, exponent: number): number {
  const [mantissa, existing] = `${value}e`.split('e') as [string, string | undefined]
  const current = existing === undefined || existing === '' ? 0 : Number(existing)
  return Number(`${mantissa}e${current + exponent}`)
}

/**
 * Round to `places` decimal places, half away from zero.
 *
 * Non-finite input is returned unchanged rather than thrown on: callers that
 * reach here with `NaN` have a validation bug to display, not an exception to
 * handle. A value too large to scale (e.g. `1e21` at 2 places) is also returned
 * unchanged — its last decimal places are below the representable precision of
 * a double anyway, so rounding it is a no-op in exact terms.
 */
export function roundHalfUp(value: number, places: number): number {
  if (!Number.isInteger(places) || places < 0) {
    throw new RangeError(`places must be a non-negative integer, received ${places}`)
  }
  if (!Number.isFinite(value)) {
    return value
  }

  const scaled = shiftExponent(value, places)
  if (!Number.isFinite(scaled)) {
    return value
  }

  const rounded = Math.round(Math.abs(scaled))
  return shiftExponent(scaled < 0 ? -rounded : rounded, -places)
}

function formatPlaces(value: number, places: number): string {
  if (!Number.isFinite(value)) {
    return String(value)
  }
  return roundHalfUp(value, places).toFixed(places)
}

/** Extrapolation factor, 10dp (e.g. `1.0034215686`). */
export function formatFactor(value: number): string {
  return formatPlaces(value, FACTOR_PLACES)
}

/** Shrinkage compensation ratio, 5dp (e.g. `0.98188`). */
export function formatRatio(value: number): string {
  return formatPlaces(value, RATIO_PLACES)
}

/** Slicer-ready percentage, 3dp (e.g. `98.188`). */
export function formatPercent(value: number): string {
  return formatPlaces(value, PERCENT_PLACES)
}

/** A measurement or an average of measurements, at caliper resolution. */
export function formatMeasurement(value: number): string {
  return formatPlaces(value, MEASUREMENT_PLACES)
}

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

export type NumberParseErrorCode = 'empty' | 'incomplete' | 'malformed'

export interface NumberParseError {
  readonly code: NumberParseErrorCode
  /** The offending text, so the caller can quote it back verbatim. */
  readonly text: string
}

export type ParsedNumber =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly error: NumberParseError }

/**
 * A complete decimal: optional sign, digits, and at most one decimal separator
 * that must be followed by digits.
 *
 * `5.` is *not* accepted even though JavaScript happily parses it, because it is
 * a half-typed value: accepting it would let a user advance past a field they
 * were still editing, which for the highest-risk screen in the product is the
 * wrong default. `.5` *is* accepted — it is unambiguous and complete.
 */
const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/

/**
 * Text that is not a number *yet* but could become one: a lone sign, a lone
 * separator, digits with a trailing separator, or nothing at all.
 *
 * The distinction is user-facing, not academic. `137.` while typing `137.5` is
 * not an error, and marking the field invalid at that keystroke makes the field
 * shout at the user for doing exactly what was asked. The gate still refuses to
 * advance — an incomplete value is not a measurement — so nothing is let through;
 * the difference is only in what the user is told.
 */
const INCOMPLETE_PATTERN = /^[+-]?(?:\d+[.,]?|[.,])?$/

/**
 * Parse user-entered decimal text, accepting either `,` or `.` as the separator.
 *
 * Note the accepted ambiguity: `1,234` parses as `1.234`, not as one thousand
 * two hundred and thirty-four. Thousands separators are not a thing in this
 * app's inputs (caliper readings run 133–139mm) and refusing every comma would
 * break the locale where `137,5` is how a millimetre is written, so the comma is
 * read as a decimal point and any resulting absurd value is caught by the
 * plausible-range *warning* rather than by a parse failure.
 */
export function parseNumber(text: string): ParsedNumber {
  const trimmed = text.trim()
  if (trimmed === '') {
    return { ok: false, error: { code: 'empty', text } }
  }
  if (DECIMAL_PATTERN.test(trimmed)) {
    const value = Number(trimmed.replace(',', '.'))
    if (Number.isFinite(value)) {
      return { ok: true, value }
    }
    return { ok: false, error: { code: 'malformed', text } }
  }
  if (INCOMPLETE_PATTERN.test(trimmed)) {
    return { ok: false, error: { code: 'incomplete', text } }
  }
  return { ok: false, error: { code: 'malformed', text } }
}
