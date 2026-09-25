import type { BeamInput } from '../lib/types.ts'
import { beamHasGapWarning, isLengthOutOfRange, parsePositiveDecimal } from '../lib/calc.ts'
import { useLocale } from '../lib/locale-context.ts'
import { messages } from '../lib/messages.ts'
import { NumberField } from './NumberField.tsx'

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
  const locale = useLocale()
  const t = () => messages(locale())

  const fieldError = (value: string) =>
    value.trim() !== '' && parsePositiveDecimal(value) === null ? t().invalidNumber : undefined

  const lengthWarning = (value: string) => {
    const parsed = parsePositiveDecimal(value)
    return parsed !== null && isLengthOutOfRange(parsed) ? t().lengthRange : undefined
  }

  const gapWarning = () => (beamHasGapWarning(props.beam) ? t().gapWarning : undefined)

  return (
    <fieldset class="truss-beam">
      <legend>{props.legend}</legend>
      <NumberField
        id={`${props.idPrefix}-outer`}
        label={props.outerLabel ?? t().outerMeasurement}
        unit="mm"
        value={props.beam.outer}
        onInput={(value) => props.onChange({ outer: value })}
        error={fieldError(props.beam.outer)}
        warning={lengthWarning(props.beam.outer)}
      />
      <NumberField
        id={`${props.idPrefix}-inner`}
        label={props.innerLabel ?? t().innerMeasurement}
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
