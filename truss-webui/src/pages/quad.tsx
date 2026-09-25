import { Dynamic } from 'solid-js/web'
import { Show, createSignal } from 'solid-js'
import type { AppApi } from '../lib/app-api.ts'
import type { QuadInput } from '../lib/types.ts'
import { FlowFrame } from '../components/FlowFrame.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import {
  calcPrinterFactor,
  calcQuadShrinkage,
  calcRecommendedXYPercent,
  formatPercent,
  formatShrinkage,
  isPercentOutOfRange,
  parsePositiveDecimal,
  quadAverage,
  xAverage,
} from '../lib/calc.ts'
import { hasNameConflict } from '../lib/printers.ts'
import { messages } from '../lib/messages.ts'
import {
  QuadEquipmentContent as QuadEquipmentEn,
  QuadFilamentContent as QuadFilamentEn,
  QuadSliceContent as QuadSliceEn,
  QuadPrintContent as QuadPrintEn,
  QuadLocateContent as QuadLocateEn,
  QuadXContent as QuadXEn,
  QuadYabContent as QuadYabEn,
  QuadNameContent as QuadNameEn,
  QuadResultContent as QuadResultEn,
} from './en/quad.tsx'
import {
  QuadEquipmentContent as QuadEquipmentJa,
  QuadFilamentContent as QuadFilamentJa,
  QuadSliceContent as QuadSliceJa,
  QuadPrintContent as QuadPrintJa,
  QuadLocateContent as QuadLocateJa,
  QuadXContent as QuadXJa,
  QuadYabContent as QuadYabJa,
  QuadNameContent as QuadNameJa,
  QuadResultContent as QuadResultJa,
} from './ja/quad.tsx'

// Shared containers for the Quad flow. Each computes validation/derived values,
// owns FlowFrame wiring, and renders the locale-selected body content.
function quadReadings(quad: QuadInput): number[] | null {
  const raw = [
    quad.x.outer,
    quad.x.inner,
    quad.y.outer,
    quad.y.inner,
    quad.a.outer,
    quad.a.inner,
    quad.b.outer,
    quad.b.inner,
  ]
  const values = raw.map(parsePositiveDecimal)
  return values.some((value) => value === null) ? null : (values as number[])
}

const pick = (app: AppApi) => app.locale() === 'ja'

export function QuadEquipment(props: { app: AppApi }) {
  const equipment = () => props.app.active()!.equipment
  const complete = () => equipment().calipers && equipment().printer && equipment().slicer

  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).quadEquipmentTitle}
      onNext={() => props.app.setStep('quad-filament')}
      nextDisabled={!complete()}
    >
      <Dynamic
        component={pick(props.app) ? QuadEquipmentJa : QuadEquipmentEn}
        app={props.app}
        complete={complete()}
      />
    </FlowFrame>
  )
}

export function QuadFilament(props: { app: AppApi }) {
  const tuning = () => props.app.active()!.tuning
  const complete = () => tuning().temperature && tuning().pressure && tuning().flow

  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).quadFilamentTitle}
      onBack={props.app.skipEquipment() ? undefined : props.app.back}
      onNext={() => props.app.setStep('quad-slice')}
      nextDisabled={!complete()}
    >
      <Dynamic component={pick(props.app) ? QuadFilamentJa : QuadFilamentEn} app={props.app} />
    </FlowFrame>
  )
}

export function QuadSlice(props: { app: AppApi }) {
  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).quadSliceTitle}
      onBack={props.app.back}
      onNext={() => props.app.setStep('quad-print')}
    >
      <Dynamic component={pick(props.app) ? QuadSliceJa : QuadSliceEn} />
    </FlowFrame>
  )
}

export function QuadPrint(props: { app: AppApi }) {
  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).quadPrintTitle}
      onBack={props.app.back}
      onNext={() => props.app.setStep('quad-locate')}
    >
      <Dynamic component={pick(props.app) ? QuadPrintJa : QuadPrintEn} />
    </FlowFrame>
  )
}

export function QuadLocate(props: { app: AppApi }) {
  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).quadLocateTitle}
      onBack={props.app.back}
      onNext={() => props.app.setStep('quad-x')}
    >
      <Dynamic component={pick(props.app) ? QuadLocateJa : QuadLocateEn} />
    </FlowFrame>
  )
}

export function QuadX(props: { app: AppApi }) {
  const beam = () => props.app.active()!.quad.x
  const complete = () =>
    parsePositiveDecimal(beam().outer) !== null && parsePositiveDecimal(beam().inner) !== null

  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).quadXTitle}
      onBack={props.app.back}
      onNext={() => props.app.setStep('quad-yab')}
      nextDisabled={!complete()}
    >
      <Dynamic component={pick(props.app) ? QuadXJa : QuadXEn} app={props.app} beam={beam()} />
    </FlowFrame>
  )
}

export function QuadYab(props: { app: AppApi }) {
  const quad = () => props.app.active()!.quad
  const allValid = () => quadReadings(quad()) !== null

  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).quadYabTitle}
      onBack={props.app.back}
      onNext={() => props.app.setStep('quad-name')}
      nextDisabled={!allValid()}
    >
      <Dynamic component={pick(props.app) ? QuadYabJa : QuadYabEn} app={props.app} quad={quad()} />
    </FlowFrame>
  )
}

export function QuadName(props: { app: AppApi }) {
  const [confirmOverwrite, setConfirmOverwrite] = createSignal(false)
  const name = () => props.app.active()!.quad.printerName
  const ready = () => quadReadings(props.app.active()!.quad) !== null && name().trim() !== ''
  const duplicate = () => name().trim() !== '' && hasNameConflict(props.app.printers(), name())

  const commit = () => {
    const values = quadReadings(props.app.active()!.quad)
    if (!values) return
    const factor = calcPrinterFactor(quadAverage(values), xAverage(values[0], values[1]))
    props.app.saveQuadPrinter(name(), factor)
  }

  const next = () => {
    if (!ready()) return
    if (duplicate()) {
      setConfirmOverwrite(true)
      return
    }
    commit()
  }

  return (
    <>
      <FlowFrame
        app={props.app}
        title={messages(props.app.locale()).quadNameTitle}
        onBack={props.app.back}
        onNext={next}
        nextDisabled={!ready()}
      >
        <Dynamic
          component={pick(props.app) ? QuadNameJa : QuadNameEn}
          app={props.app}
          name={name()}
          duplicate={duplicate()}
        />
      </FlowFrame>

      <Show when={confirmOverwrite()}>
        <ConfirmDialog
          title={messages(props.app.locale()).overwriteTitle}
          message={messages(props.app.locale()).overwriteMessage(name().trim())}
          confirmLabel={messages(props.app.locale()).overwriteConfirm}
          onConfirm={() => {
            setConfirmOverwrite(false)
            commit()
          }}
          onCancel={() => setConfirmOverwrite(false)}
        />
      </Show>
    </>
  )
}

export function QuadResult(props: { app: AppApi }) {
  const quad = () => props.app.active()!.quad
  const values = () => quadReadings(quad()) ?? []
  const shrinkage = () => calcQuadShrinkage(quadAverage(values()))
  const factor = () => calcPrinterFactor(quadAverage(values()), xAverage(values()[0], values()[1]))

  const currentParsed = () => parsePositiveDecimal(quad().currentXY)
  const currentValid = () => currentParsed() !== null
  const recommended = () => {
    const current = currentParsed()
    return current === null ? null : calcRecommendedXYPercent(current, shrinkage())
  }
  const percentWarning = () => {
    const current = currentParsed()
    return current !== null && isPercentOutOfRange(current)
  }

  return (
    <FlowFrame
      app={props.app}
      title={messages(props.app.locale()).quadResultTitle}
      onNext={props.app.finish}
      nextLabel={messages(props.app.locale()).finish}
      nextClass="truss-button-secondary"
      nextDisabled={!currentValid()}
    >
      <Dynamic
        component={pick(props.app) ? QuadResultJa : QuadResultEn}
        app={props.app}
        shrinkage={formatShrinkage(shrinkage())}
        factor={factor()}
        recommendedPercent={recommended() === null ? null : formatPercent(recommended()!)}
        currentValid={currentValid()}
        percentWarning={percentWarning()}
      />
    </FlowFrame>
  )
}
