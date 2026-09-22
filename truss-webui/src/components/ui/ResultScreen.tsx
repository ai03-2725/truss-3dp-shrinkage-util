import { type Component, createMemo, createSignal } from 'solid-js'
import { finalShrinkagePercent, format4dp, format5dp } from '../../lib/calc'
import { DEFAULT_CURRENT_XY_PERCENT } from '../../lib/constants'
import { parseNumber, validatePercent } from '../../lib/validation'
import { CopyButton } from './CopyButton'
import { NumberField } from './Field'
import { FlowLayout } from './FlowLayout'
import { ZoomImage } from './ZoomImage'

export interface ResultScreenProps {
  current: number
  total: number
  printerName?: string
  /** Label for the ratio shown mid-sentence, e.g. "compensation ratio". */
  ratioLabel: string
  ratio: number
  onFinish: () => void
}

/**
 * Shared payoff layout for Q9/S6 (PRD §13.2). Ordering deliberately keeps the
 * compensation ratio low-key so it cannot be mistaken for the final value.
 */
export const ResultScreen: Component<ResultScreenProps> = (props) => {
  const [percent, setPercent] = createSignal(String(DEFAULT_CURRENT_XY_PERCENT))
  const percentValid = () => validatePercent(percent())
  const finalValue = createMemo(() => {
    const current = parseNumber(percent())
    if (current === null) return null
    return finalShrinkagePercent(current, props.ratio)
  })

  return (
    <FlowLayout
      current={props.current}
      total={props.total}
      printerName={props.printerName}
      onFinish={props.onFinish}
    >
      <h1 class="truss-page__title">Apply the result</h1>

      <p>
        Locate the XY shrinkage option for the filament in use in your slicer
        (for Orca/Bambu: edit the filament settings, then find the XY shrinkage
        field).
      </p>
      <div class="truss-inline-images">
        <ZoomImage name="shrinkageAdjust1" />
        <ZoomImage name="shrinkageAdjust2" />
      </div>

      <NumberField
        id="truss-result-current"
        label="Current XY shrinkage %"
        unit="%"
        value={percent()}
        onInput={setPercent}
        error={
          percent() !== '' && !percentValid()
            ? 'Enter a percentage greater than 0 and up to 1000.'
            : undefined
        }
      />
      <p class="truss-page__lede">
        Enter the current value found in your slicer. Most slicers default to
        100.
      </p>

      <p class="truss-result__sentence">
        Based on the above and a calculated {props.ratioLabel} of{' '}
        {format5dp(props.ratio)}, your calculated filament XY shrinkage is
      </p>

      <div class="truss-result">
        <p class="truss-result__value">
          {finalValue() === null ? '—' : format4dp(finalValue() as number)}
        </p>
        <CopyButton
          value={finalValue() === null ? '' : format4dp(finalValue() as number)}
          label="Copy value"
        />
      </div>

      <p>
        Enter this value into the slicer's XY shrinkage field. Finish returns to
        the home screen.
      </p>
    </FlowLayout>
  )
}
