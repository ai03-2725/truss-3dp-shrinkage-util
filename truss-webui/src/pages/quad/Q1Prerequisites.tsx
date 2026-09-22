import { type Component, createSignal, Show } from 'solid-js'
import { Checkbox } from '../../components/ui/Checkbox'
import { FlowLayout } from '../../components/ui/FlowLayout'

export interface Q1Props {
  current: number
  total: number
  onExit: () => void
  onContinue: (dontAskAgain: boolean) => void
}

/** Q1 — hardware prerequisites and the persistent skip flag (PRD §10, §7.2). */
export const Q1Prerequisites: Component<Q1Props> = (props) => {
  const [calipers, setCalipers] = createSignal(false)
  const [printer, setPrinter] = createSignal(false)
  const [slicer, setSlicer] = createSignal(false)
  const [dontAskAgain, setDontAskAgain] = createSignal(false)

  const allChecked = () => calipers() && printer() && slicer()

  return (
    <FlowLayout
      current={props.current}
      total={props.total}
      onExit={props.onExit}
      onContinue={() => props.onContinue(dontAskAgain())}
      continueDisabled={!allChecked()}
    >
      <h1 class="truss-page__title">Before you start</h1>
      <p>
        The Truss calibrator is only as accurate as the tools and printer you
        use it with. Please confirm you have the following three things.
      </p>

      <div class="truss-page__section">
        <Checkbox
          id="truss-q1-calipers"
          checked={calipers()}
          onChange={setCalipers}
          label="A decent modern pair of digital calipers that can measure a 140mm wide object (150mm+ range) without drifting or error."
        />
        <Checkbox
          id="truss-q1-printer"
          checked={printer()}
          onChange={setPrinter}
          label="A functional, calibrated modern printer with a build plate of at least 150x150mm that prints without warping, curling, or deforming."
        />
        <Checkbox
          id="truss-q1-slicer"
          checked={slicer()}
          onChange={setSlicer}
          label="A modern slicer that can slice the Truss calibrators reliably and ideally exposes a per-filament XY shrinkage setting."
        />
      </div>

      <Checkbox
        id="truss-q1-dontask"
        checked={dontAskAgain()}
        disabled={!allChecked()}
        onChange={(checked) => setDontAskAgain(allChecked() && checked)}
        label="Don't ask again"
      />

      <Show when={!allChecked()}>
        <p class="truss-page__lede">Check every item above to continue.</p>
      </Show>
    </FlowLayout>
  )
}
