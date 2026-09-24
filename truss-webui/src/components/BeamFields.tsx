import type { BeamInput } from '../lib/types.ts'
import { beamHasGapWarning, isLengthOutOfRange, parsePositiveDecimal } from '../lib/calc.ts'
import { NumberField } from './NumberField.tsx'

const INVALID = 'Enter a positive number, using a period as the decimal separator.'
const RANGE = 'This is outside the expected 135–142 mm range. Double-check the measurement.'
const GAP =
  'The inner and outer measurements differ by more than 0.4 mm. Recheck both measurements and your filament tuning before continuing.'

// Two measurement inputs for one beam plus its length/gap warnings. Used by the
// Quad X/Y/A/B steps and the Single measure step.
export function BeamFields(props: {
  idPrefix: string
  legend: string
  beam: BeamInput
  onChange: (patch: Partial<BeamInput>) => void
  outerLabel?: string
  innerLabel?: string
}) {
  const fieldError = (value: string) =>
    value.trim() !== '' && parsePositiveDecimal(value) === null ? INVALID : undefined

  const lengthWarning = (value: string) => {
    const parsed = parsePositiveDecimal(value)
    return parsed !== null && isLengthOutOfRange(parsed) ? RANGE : undefined
  }

  const gapWarning = () => (beamHasGapWarning(props.beam) ? GAP : undefined)

  return (
    <fieldset class="truss-beam">
      <legend>{props.legend}</legend>
      <NumberField
        id={`${props.idPrefix}-outer`}
        label={props.outerLabel ?? 'Outer measurement'}
        unit="mm"
        value={props.beam.outer}
        onInput={(value) => props.onChange({ outer: value })}
        error={fieldError(props.beam.outer)}
        warning={lengthWarning(props.beam.outer)}
      />
      <NumberField
        id={`${props.idPrefix}-inner`}
        label={props.innerLabel ?? 'Inner measurement'}
        unit="mm"
        value={props.beam.inner}
        onInput={(value) => props.onChange({ inner: value })}
        error={fieldError(props.beam.inner)}
        warning={lengthWarning(props.beam.inner)}
      />
      {gapWarning() && (
        <p class="truss-warning" role="status">
          {gapWarning()}
        </p>
      )}
    </fieldset>
  )
}
