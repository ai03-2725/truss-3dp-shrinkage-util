import { createMemo, createSignal, Show, untrack, type JSX } from 'solid-js'
import { IMAGES } from '../assets/urls'
import { setCurrentSlicerPercent, type CalibrationDraft } from '../domain/draft'
import {
  applyCurrentSlicerValue,
  DEFAULT_CURRENT_SLICER_PERCENT,
  evaluateQuad,
  evaluateSingle,
  type CalibrationOutcome,
} from '../domain/math'
import { formatMeasurement, formatPercent, parseNumber } from '../domain/number'
import type { PrinterRepository } from '../storage/printers'
import { announce } from './a11y'
import { DetailsBlock, type DetailRow } from './flow-ui'

/**
 * The results screen (T29, PRD §10, decision 8).
 *
 * The slicer-ready percentage is the hero, and it is presented twice over on
 * purpose: there is a copy button, *and* the digits are shown large enough to
 * read across the room. The clipboard does not cross devices, and the two halves
 * of this job plausibly happen on different ones — measuring at the printer,
 * editing the slicer at a desk — so a value that exists only behind a copy button
 * is a value the user cannot get.
 *
 * Recalculation always uses the full-precision ratio. The rounded ratio is
 * displayed next to it and never feeds the percentage, which is the one thing
 * this screen must not get wrong: the user retypes the percentage.
 */

export interface ResultsStepProps {
  readonly draft: CalibrationDraft
  readonly update: (change: (draft: CalibrationDraft) => CalibrationDraft) => void
  readonly printers: PrinterRepository
}

export function ResultsStep(props: ResultsStepProps): JSX.Element {
  const outcome = createMemo<CalibrationOutcome | null>(() => {
    if (props.draft.flow === 'quad') {
      return evaluateQuad(props.draft)
    }
    const stored =
      props.draft.printerName === null ? null : props.printers.getByName(props.draft.printerName)
    if (stored === null) {
      return null
    }
    // The factor comes from storage as a full-precision number — never from the
    // displayed 10dp string.
    return evaluateSingle(props.draft, stored.extrapolationFactor)
  })

  const [current, setCurrent] = createSignal(
    // `untrack` says what this is: a one-off read that seeds the input, after
    // which the input owns the value. A tracked read here would rewrite what the
    // user is typing.
    untrack(() =>
      props.draft.currentSlicerPercent === ''
        ? String(DEFAULT_CURRENT_SLICER_PERCENT)
        : props.draft.currentSlicerPercent,
    ),
  )
  const [copied, setCopied] = createSignal<'idle' | 'copied' | 'failed'>('idle')

  const currentParsed = () => parseNumber(current())
  const currentError = (): string | null => {
    if (current().trim() === '') {
      return 'Enter the value that is in your slicer now.'
    }
    const parsed = currentParsed()
    if (!parsed.ok) {
      return parsed.error.code === 'incomplete' ? null : `“${current().trim()}” is not a number.`
    }
    return parsed.value > 0 ? null : 'The value must be greater than zero.'
  }

  /** Soft warnings only: a slicer value outside this band is unusual, not invalid. */
  const currentWarning = (): string | null => {
    const parsed = currentParsed()
    if (!parsed.ok || currentError() !== null) {
      return null
    }
    if (parsed.value < 90 || parsed.value > 110) {
      return 'Most slicers start at 100%. A value this far from 100 is worth double-checking before entering the result — the two are multiplied together.'
    }
    return null
  }

  const percentage = createMemo(() => {
    const result = outcome()
    if (result === null || currentError() !== null) {
      return null
    }
    const parsed = currentParsed()
    if (!parsed.ok) {
      return null
    }
    return applyCurrentSlicerValue(parsed.value, result.ratio)
  })

  const display = () => {
    const value = percentage()
    return value === null ? '—' : `${formatPercent(value)}%`
  }

  async function copy(): Promise<void> {
    const text = display().replace('%', '')
    try {
      await navigator.clipboard.writeText(text)
      setCopied('copied')
      announce('Percentage copied to the clipboard.')
    } catch {
      // A refused clipboard is an ordinary outcome (insecure context, embedded
      // frame, denied permission). The digits are on screen, so this is an
      // inconvenience rather than a failure, and it says so.
      setCopied('failed')
      announce('Copying is not available here. The value is shown on screen to transcribe.')
    }
  }

  const detailRows = (result: CalibrationOutcome): DetailRow[] => {
    if (result.flow === 'quad') {
      return [
        { label: 'Average of all 8 measurements', value: result.display.mean },
        { label: 'X beam average', value: result.display.basis },
        { label: 'Extrapolation factor', value: result.display.factor, emphasis: true },
        { label: 'Shrinkage compensation ratio', value: result.display.ratio },
      ]
    }
    const x = result.pairs[0]
    return [
      { label: 'Outer measurement', value: formatMeasurement(x.outer) },
      { label: 'Inner measurement', value: formatMeasurement(x.inner) },
      { label: 'Their average', value: result.display.mean },
      { label: 'Stored extrapolation factor', value: result.display.factor, emphasis: true },
      { label: 'Extrapolated average', value: formatMeasurement(result.extrapolatedAverage) },
      { label: 'Shrinkage compensation ratio', value: result.display.ratio },
    ]
  }

  return (
    <div class="stack">
      <Show
        when={outcome()}
        fallback={<p class="banner">The measurements for this calibration are incomplete.</p>}
      >
        {(result) => (
          <>
            <p>
              Your slicer’s XY shrinkage setting multiplies the shrinkage into the model. This
              calibration measured a ratio of{' '}
              <strong class="numeric">{result().display.ratio}</strong> — enter what your slicer
              currently has, and the value to replace it with appears below.
            </p>

            <div class="stack">
              <label for="current-slicer-value">
                Current XY shrinkage value in your slicer (%)
              </label>
              <input
                id="current-slicer-value"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                value={current()}
                aria-invalid={currentError() === null ? 'false' : 'true'}
                aria-describedby={
                  [
                    currentError() === null ? null : 'current-slicer-value-error',
                    currentWarning() === null ? null : 'current-slicer-value-warning',
                  ]
                    .filter((id) => id !== null)
                    .join(' ') || undefined
                }
                onInput={(event) => {
                  setCurrent(event.currentTarget.value)
                  setCopied('idle')
                  props.update((draft) => setCurrentSlicerPercent(draft, event.currentTarget.value))
                }}
              />
              <Show when={currentError()}>
                {(message) => (
                  <p class="error" id="current-slicer-value-error" role="alert">
                    {message()}
                  </p>
                )}
              </Show>
              <Show when={currentWarning()}>
                {(message) => (
                  <p class="warning" id="current-slicer-value-warning">
                    {message()}
                  </p>
                )}
              </Show>
            </div>

            <div class="stack">
              <h3>Enter this in your slicer</h3>
              <p class="readout numeric" data-testid="hero-percentage">
                {display()}
              </p>
              <div class="row">
                <button
                  type="button"
                  onClick={() => void copy()}
                  disabled={percentage() === null}
                  data-testid="copy"
                >
                  Copy the value
                </button>
                <Show when={copied() === 'copied'}>
                  <span class="muted" role="status">
                    Copied
                  </span>
                </Show>
                <Show when={copied() === 'failed'}>
                  <span class="muted" role="status">
                    Copying is not available here — the digits above are the value.
                  </span>
                </Show>
              </div>
            </div>

            <div class="stack">
              <h3>Where to put it</h3>
              <p>
                In your slicer, open the filament you are using and find its XY shrinkage setting.
                Replace the value with the one above — it already includes the current value, so do
                not multiply again.
              </p>
              <p class="muted">
                OrcaSlicer and Bambu Studio: Filament settings → “Shrinkage (XY)”. Other slicers use
                the same name or “XY compensation”.
              </p>
              <img
                src={IMAGES.shrinkageAdjust1}
                alt="The XY shrinkage setting in the filament settings."
                loading="lazy"
              />
              <img
                src={IMAGES.shrinkageAdjust2}
                alt="The XY shrinkage value changed."
                loading="lazy"
              />
            </div>

            <DetailsBlock title="How this was calculated" rows={detailRows(result())} />

            <Show when={result().flow === 'quad'}>
              <p class="muted">
                The extrapolation factor above is worth writing down. If it could not be saved to
                this browser, it can be added by hand on the saved printers screen.
              </p>
            </Show>
          </>
        )}
      </Show>
    </div>
  )
}
