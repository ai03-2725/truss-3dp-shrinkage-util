import { Dynamic } from 'solid-js/web'
import type { AppApi } from '../lib/app-api.ts'
import { FlowFrame } from '../components/FlowFrame.tsx'
import {
  calcRecommendedXYPercent,
  calcSingleShrinkage,
  formatPercent,
  formatShrinkage,
  isPercentOutOfRange,
  namesMatch,
  parsePositiveDecimal,
  xAverage,
} from '../lib/calc.ts'
import { messages } from '../lib/messages.ts'
import {
  SinglePrinterContent as SinglePrinterEn,
  SingleFilamentContent as SingleFilamentEn,
  SingleSliceContent as SingleSliceEn,
  SinglePrintContent as SinglePrintEn,
  SingleMeasureContent as SingleMeasureEn,
  SingleResultContent as SingleResultEn,
} from './en/single.tsx'
import {
  SinglePrinterContent as SinglePrinterJa,
  SingleFilamentContent as SingleFilamentJa,
  SingleSliceContent as SingleSliceJa,
  SinglePrintContent as SinglePrintJa,
  SingleMeasureContent as SingleMeasureJa,
  SingleResultContent as SingleResultJa,
} from './ja/single.tsx'

// Shared containers for the Single flow.
const pick = (app: AppApi) => app.locale() === 'ja'

export function SinglePrinter(props: { app: AppApi }) {
  const selected = () => props.app.active()!.selectedPrinterName

  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).singlePrinterTitle}
      onNext={() => props.app.setStep('single-filament')}
      nextDisabled={selected() === ''}
    >
      <Dynamic component={pick(props.app) ? SinglePrinterJa : SinglePrinterEn} app={props.app} />
    </FlowFrame>
  )
}

export function SingleFilament(props: { app: AppApi }) {
  const tuning = () => props.app.active()!.tuning
  const complete = () => tuning().temperature && tuning().pressure && tuning().flow

  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).singleFilamentTitle}
      onBack={props.app.back}
      onNext={() => props.app.setStep('single-slice')}
      nextDisabled={!complete()}
    >
      <Dynamic component={pick(props.app) ? SingleFilamentJa : SingleFilamentEn} app={props.app} />
    </FlowFrame>
  )
}

export function SingleSlice(props: { app: AppApi }) {
  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).singleSliceTitle}
      onBack={props.app.back}
      onNext={() => props.app.setStep('single-print')}
    >
      <Dynamic component={pick(props.app) ? SingleSliceJa : SingleSliceEn} />
    </FlowFrame>
  )
}

export function SinglePrint(props: { app: AppApi }) {
  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).singlePrintTitle}
      onBack={props.app.back}
      onNext={() => props.app.setStep('single-measure')}
    >
      <Dynamic component={pick(props.app) ? SinglePrintJa : SinglePrintEn} />
    </FlowFrame>
  )
}

export function SingleMeasure(props: { app: AppApi }) {
  const beam = () => props.app.active()!.single
  const complete = () =>
    parsePositiveDecimal(beam().outer) !== null && parsePositiveDecimal(beam().inner) !== null

  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).singleMeasureTitle}
      onBack={props.app.back}
      onNext={() => props.app.setStep('single-result')}
      nextDisabled={!complete()}
    >
      <Dynamic component={pick(props.app) ? SingleMeasureJa : SingleMeasureEn} app={props.app} beam={beam()} />
    </FlowFrame>
  )
}

export function SingleResult(props: { app: AppApi }) {
  const active = () => props.app.active()!
  const printer = () =>
    props.app.printers().find((candidate) => namesMatch(candidate.name, active().selectedPrinterName))

  const complete = () =>
    parsePositiveDecimal(active().single.outer) !== null &&
    parsePositiveDecimal(active().single.inner) !== null

  const xAvg = () =>
    xAverage(parsePositiveDecimal(active().single.outer)!, parsePositiveDecimal(active().single.inner)!)
  const shrinkage = () => {
    const saved = printer()
    if (!saved || !complete()) return null
    return calcSingleShrinkage(xAvg(), saved.extrapolationFactor)
  }

  const currentParsed = () => parsePositiveDecimal(active().single.currentXY)
  const currentValid = () => currentParsed() !== null
  const recommended = () => {
    const value = shrinkage()
    const current = currentParsed()
    return value === null || current === null ? null : calcRecommendedXYPercent(current, value)
  }
  const percentWarning = () => {
    const current = currentParsed()
    return current !== null && isPercentOutOfRange(current)
  }
  const missingPrinter = () => !printer() || shrinkage() === null

  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).singleResultTitle}
      onNext={props.app.finish}
      nextLabel={messages(props.app.locale()).finish}
      nextClass="truss-button-secondary"
      nextDisabled={!currentValid()}
    >
      <Dynamic
        component={pick(props.app) ? SingleResultJa : SingleResultEn}
        app={props.app}
        missingPrinter={missingPrinter()}
        shrinkage={shrinkage() === null ? null : formatShrinkage(shrinkage()!)}
        recommendedPercent={recommended() === null ? null : formatPercent(recommended()!)}
        currentValid={currentValid()}
        percentWarning={percentWarning()}
      />
    </FlowFrame>
  )
}
