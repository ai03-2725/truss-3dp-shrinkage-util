import { Dynamic } from 'solid-js/web'
import type { JSX } from 'solid-js'
import { useLocale } from '../lib/locale-context.ts'
import {
  MeasurementWarningsContent as MeasurementWarningsEn,
  InnerJawGuidanceContent as InnerJawGuidanceEn,
} from '../pages/en/guides.tsx'
import {
  MeasurementWarningsContent as MeasurementWarningsJa,
  InnerJawGuidanceContent as InnerJawGuidanceJa,
} from '../pages/ja/guides.tsx'

export { Figure } from './Figure.tsx'

// Locale-selected wrappers around the formatted guide content. `note` is passed
// through so the Single flow can add its variant-specific caveat.
export function MeasurementWarnings() {
  const locale = useLocale()
  return (
    <Dynamic component={locale() === 'ja' ? MeasurementWarningsJa : MeasurementWarningsEn} />
  )
}

export function InnerJawGuidance(props: { note?: JSX.Element }) {
  const locale = useLocale()
  return (
    <Dynamic
      component={locale() === 'ja' ? InnerJawGuidanceJa : InnerJawGuidanceEn}
      note={props.note}
    />
  )
}
