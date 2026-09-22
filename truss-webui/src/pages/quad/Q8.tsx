import { createSignal } from 'solid-js'
import FlowLayout from '../../components/FlowLayout'
import { TextField } from '../../components/ui'
import type { AppStore } from '../../lib/appState'
import { format5dp, quadExtrapolationFactor } from '../../lib/calc'
import { quadScreens } from '../../lib/flows'
import { validatePrinterName } from '../../lib/validation'

export default function Q8(props: { app: AppStore }) {
  const [name, setName] = createSignal('')

  const factor = () => quadExtrapolationFactor(props.app.measurements())

  const nameValid = () =>
    validatePrinterName(
      name(),
      props.app.printers().map((printer) => printer.name),
    ).valid

  const save = () => {
    if (!nameValid()) return
    const printer = { name: name().trim(), extrapolationFactor: factor() }
    props.app.addPrinter(printer)
    props.app.selectPrinter(printer)
    props.app.go('q9')
  }

  return (
    <FlowLayout
      app={props.app}
      screens={quadScreens(props.app.prefs().skipPrerequisiteCheck)}
      screen="q8"
      title="Your extrapolation factor"
      onBack={() => props.app.back()}
      onContinue={save}
      continueLabel="Save & Continue"
      continueDisabled={!nameValid()}
    >
      <p>
        The extrapolation factor compares the average of all eight measurements
        to the average of just the two X measurements. It lets you estimate a
        full quad-beam average from a single-beam print later, so a later
        Single-Beam calibration can still be accurate.
      </p>

      <p>
        This printer's extrapolation factor is:{' '}
        <strong>{format5dp(factor())}</strong>
      </p>

      <p>
        <strong>Note:</strong> this is not the filament shrinkage value. Do not
        enter it into your slicer.
      </p>

      <p>
        This factor is printer-specific. It only stays valid while the printer's
        skew is unchanged - if you adjust skew settings, reprint a quad Truss
        and recalculate it.
      </p>

      <TextField
        id="q8-name"
        label="Name this printer"
        value={name()}
        onInput={setName}
        placeholder="e.g. Bambu P1S"
        autocomplete="off"
        error={
          name().trim() !== '' && !nameValid()
            ? validatePrinterName(
                name(),
                props.app.printers().map((printer) => printer.name),
              ).error
            : undefined
        }
      />
    </FlowLayout>
  )
}
