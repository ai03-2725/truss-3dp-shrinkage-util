import { cleanup, render, screen } from '@solidjs/testing-library'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { AxisId } from '../domain/types'
import { Calibrator } from './Calibrator'
import { createTestApp, type TestApp } from '../test-utils/app'

/**
 * End-to-end flow tests (T30.4, T32.2/T32.4, T33).
 *
 * These drive the real screens through the real engine, so they are the tests
 * that would catch a registration mistake, a gate wired to the wrong check, or a
 * step that quietly drops a reading. The arithmetic assertions use the PRD's
 * golden fixtures (§14.1) and are hand-computed in `math.test.ts` — here they are
 * re-checked through the UI, which is the point: 98.188 must survive the trip
 * through the DOM, the draft, and the storage layer.
 *
 * Fixture B  quad:   X 138.0/137.0 · Y 137.0/136.5 · A 138.2/138.0 · B 137.6/137.4
 *                    → F = 137.4625 / 137.50, R = 0.981875 → 98.188% at 100
 * Fixture C  single: one beam measured 137.60/137.40 with that saved factor
 *                    → the same 98.188%
 */

const FIXTURE_B: Readonly<Record<AxisId, readonly [string, string]>> = {
  X: ['138.0', '137.0'],
  Y: ['137.0', '136.5'],
  A: ['138.2', '138.0'],
  B: ['137.6', '137.4'],
}

const FIXTURE_B_FACTOR = 137.4625 / 137.5

function mount(app: TestApp): UserEvent {
  render(() => <Calibrator dependencies={app} />)
  return userEvent.setup()
}

/** Tick one checkbox by a fragment of its visible label. */
async function tick(user: UserEvent, label: RegExp): Promise<void> {
  const box = screen.getByLabelText(label)
  if (!(box as HTMLInputElement).checked) {
    await user.click(box)
  }
}

async function next(user: UserEvent): Promise<void> {
  await user.click(screen.getByTestId('next'))
}

/** The three C1 prerequisites, all of which the gate requires. */
async function passPrerequisites(user: UserEvent): Promise<void> {
  await tick(user, /digital calipers/)
  await tick(user, /functional, calibrated printer/)
  await tick(user, /modern slicer/)
  await next(user)
}

/** The three filament checks on Q1/S2. */
async function passFilament(user: UserEvent): Promise<void> {
  await tick(user, /Temperature settings/)
  await tick(user, /Pressure advance/)
  await tick(user, /^Flow rate/)
  await next(user)
}

async function measure(
  user: UserEvent,
  axis: AxisId,
  values: readonly [string, string],
): Promise<void> {
  await user.type(screen.getByLabelText(new RegExp(`^${axis} outer`)), values[0])
  await user.type(screen.getByLabelText(new RegExp(`^${axis} inner`)), values[1])
}

/**
 * Walk the first-time (quad) flow from the landing screen to the save gate.
 *
 * Written as one helper rather than repeated inline so the many tests that only
 * care about the *end* of the flow stay readable, and so a change to the step
 * order has one place to be fixed.
 */
async function runQuadToSaveGate(user: UserEvent): Promise<void> {
  await user.click(screen.getByTestId('start'))
  await passPrerequisites(user)
  await user.click(screen.getByLabelText(/have not calibrated this printer yet/))
  await next(user)
  await passFilament(user)
  await tick(user, /no seams on the measured faces/)
  await next(user)
  await tick(user, /cooled it, and removed it without forcing it/)
  await next(user)
  await next(user) // Q4 is instructional only.
  await measure(user, 'X', FIXTURE_B.X)
  await next(user)
  await measure(user, 'Y', FIXTURE_B.Y)
  await measure(user, 'A', FIXTURE_B.A)
  await measure(user, 'B', FIXTURE_B.B)
  await next(user)
}

/** Walk the quad flow through the save gate to the results screen. */
async function runQuadToResults(user: UserEvent, printerName = 'Rig One'): Promise<void> {
  await runQuadToSaveGate(user)

  // A browser that cannot store anything drops the save gate altogether, so the
  // field is optional here rather than a step in the walk.
  const nameField = screen.queryByLabelText(/Save this factor for/)
  if (nameField !== null) {
    await user.type(nameField, printerName)
    await user.click(screen.getByTestId('save-printer'))
  }
  await next(user)
}

afterEach(cleanup)

describe('quad flow — fixture B end to end (T30.4)', () => {
  it('produces 98.188% after eight readings typed through the UI', async () => {
    const app = createTestApp()
    const user = mount(app)

    await runQuadToResults(user)

    expect(screen.getByTestId('hero-percentage').textContent).toContain('98.188')
  })

  it('shows the extrapolation factor at 10dp and the ratio at 5dp', async () => {
    const app = createTestApp()
    const user = mount(app)

    await runQuadToResults(user)

    const details = screen.getByTestId('details').textContent ?? ''
    expect(details).toContain('0.9997272727')
    expect(details).toContain('0.98188')
    // The mean of all eight readings, at measurement precision.
    expect(details).toContain('137.46')
  })

  it('saves the printer with the factor at full precision', async () => {
    const app = createTestApp()
    const user = mount(app)

    await runQuadToResults(user, 'Rig One')

    const saved = app.printers.getByName('Rig One')
    expect(saved?.extrapolationFactor).toBe(FIXTURE_B_FACTOR)
  })

  it('reaches the finished screen and returns to the landing screen', async () => {
    const app = createTestApp()
    const user = mount(app)

    await runQuadToResults(user)
    await next(user)

    expect(screen.getByTestId('exit-to-landing')).toBeInTheDocument()
    await user.click(screen.getByTestId('exit-to-landing'))
    expect(screen.getByTestId('start')).toBeInTheDocument()
  })

  it('carries the result through to the slicer value the user already has', async () => {
    const app = createTestApp()
    const user = mount(app)

    await runQuadToResults(user)

    const field = screen.getByLabelText(/Current XY shrinkage value/)
    await user.clear(field)
    await user.type(field, '98.5')

    // 0.981875 × 98.5 / 100 = 0.96714... → 96.715%
    expect(screen.getByTestId('hero-percentage').textContent).toContain('96.715')
  })
})

describe('quick flow — fixture C end to end (T32.2, T32.4)', () => {
  it('reproduces the quad flow result from a single beam', async () => {
    const app = createTestApp()
    app.printers.add({ name: 'Rig One', extrapolationFactor: FIXTURE_B_FACTOR })
    const user = mount(app)

    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)
    await user.click(screen.getByLabelText(/already has a saved factor/))
    await next(user)

    // S1 — the picker.
    await user.click(screen.getByLabelText(/^Rig One/))
    await next(user)

    await passFilament(user)
    await tick(user, /no seams on the measured faces/)
    await next(user)
    await tick(user, /cooled it, and removed it without forcing it/)
    await next(user)

    await measure(user, 'X', ['137.6', '137.4'])
    await next(user)

    expect(screen.getByTestId('hero-percentage').textContent).toContain('98.188')
  })

  it('disables the single-beam branch until a printer is saved', async () => {
    const app = createTestApp()
    const user = mount(app)

    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)

    expect(screen.getByLabelText(/already has a saved factor/)).toBeDisabled()
    expect(
      screen.getByText(
        'No printers saved - run a first-time calibration first or import saved printer profiles.',
      ),
    ).toBeInTheDocument()
  })
})

describe('leaving a flow (T26.6, T33)', () => {
  it('confirms before discarding, defaults to staying, and keeps the readings', async () => {
    const app = createTestApp()
    const user = mount(app)

    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)
    await user.click(screen.getByLabelText(/have not calibrated this printer yet/))
    await next(user)
    await passFilament(user)
    await tick(user, /no seams on the measured faces/)
    await next(user)
    await tick(user, /cooled it, and removed it without forcing it/)
    await next(user)
    await next(user)
    await measure(user, 'X', FIXTURE_B.X)

    await user.click(screen.getByRole('button', { name: 'Cancel calibration' }))

    expect(screen.getByTestId('exit-confirmation')).toBeInTheDocument()
    // The safe default: focus must not sit on the destructive button.
    expect(screen.getByTestId('stay')).toHaveFocus()

    await user.click(screen.getByTestId('stay'))

    expect(screen.queryByTestId('exit-confirmation')).not.toBeInTheDocument()
    expect((screen.getByLabelText(/^X outer/) as HTMLInputElement).value).toBe('138.0')
    expect((screen.getByLabelText(/^X inner/) as HTMLInputElement).value).toBe('137.0')
  })

  it('discards the readings when the user confirms', async () => {
    const app = createTestApp()
    const user = mount(app)

    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)
    await user.click(screen.getByLabelText(/have not calibrated this printer yet/))
    await next(user)
    await passFilament(user)
    await tick(user, /no seams on the measured faces/)
    await next(user)
    await tick(user, /cooled it, and removed it without forcing it/)
    await next(user)
    await next(user)
    await measure(user, 'X', FIXTURE_B.X)

    await user.click(screen.getByRole('button', { name: 'Cancel calibration' }))
    await user.click(screen.getByTestId('leave'))

    expect(screen.getByTestId('start')).toBeInTheDocument()

    // Starting again is a new flow: nothing was retained.
    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)
    await user.click(screen.getByLabelText(/have not calibrated this printer yet/))
    await next(user)
    await passFilament(user)
    await tick(user, /no seams on the measured faces/)
    await next(user)
    await tick(user, /cooled it, and removed it without forcing it/)
    await next(user)
    await next(user)
    expect((screen.getByLabelText(/^X outer/) as HTMLInputElement).value).toBe('')
  })
})

describe('prerequisites persistence (T24.5)', () => {
  it('skips the checklist once it has been opted out of, and persists the choice', async () => {
    const app = createTestApp()
    const user = mount(app)

    await user.click(screen.getByTestId('start'))
    await tick(user, /digital calipers/)
    await tick(user, /functional, calibrated printer/)
    await tick(user, /modern slicer/)
    await user.click(screen.getByLabelText(/Don’t ask again/))

    expect(app.settings.skipPrerequisites()).toBe(true)
    expect(app.host.raw('truss-calibrator:v1:settings')).not.toBeNull()

    await next(user)
    // C2 follows directly: the checklist is behind us.
    expect(screen.getByLabelText(/have not calibrated this printer yet/)).toBeInTheDocument()
  })
})

describe('storage-less browser (T33)', () => {
  it('skips the unsatisfiable save gate and still reaches a result', async () => {
    const app = createTestApp({ host: null })
    const user = mount(app)

    await runQuadToSaveGate(user)

    // The gate is unsatisfiable here, so it must not be presented as one.
    expect(screen.getByTestId('save-gate-skipped')).toBeInTheDocument()
    expect(screen.queryByTestId('printer-name-field')).not.toBeInTheDocument()
    expect(screen.getByTestId('next')).toBeEnabled()

    await next(user)
    expect(screen.getByTestId('hero-percentage').textContent).toContain('98.188')
  })
})

describe('name collision at the save gate (T28.6)', () => {
  it('blocks with the recovery copy, then accepts a different name without losing readings', async () => {
    const app = createTestApp()
    app.printers.add({ name: 'Rig', extrapolationFactor: 0.999 })
    const user = mount(app)

    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)
    await user.click(screen.getByLabelText(/have not calibrated this printer yet/))
    await next(user)
    await passFilament(user)
    await tick(user, /no seams on the measured faces/)
    await next(user)
    await tick(user, /cooled it, and removed it without forcing it/)
    await next(user)
    await next(user)
    await measure(user, 'X', FIXTURE_B.X)
    await next(user)
    await measure(user, 'Y', FIXTURE_B.Y)
    await measure(user, 'A', FIXTURE_B.A)
    await measure(user, 'B', FIXTURE_B.B)
    await next(user)

    // Case-insensitively a duplicate, so the save must be refused.
    await user.type(screen.getByLabelText(/Save this factor for/), 'rig')
    await user.click(screen.getByTestId('save-printer'))

    const error = screen.getByTestId('save-error').textContent ?? ''
    expect(error).toContain('already saved')
    expect(error).toContain('discards all eight measurements')
    expect(screen.getByTestId('next')).toBeDisabled()

    // The recovery path the copy recommends: a different name, same readings.
    const field = screen.getByLabelText(/Save this factor for/)
    await user.clear(field)
    await user.type(field, 'Rig Two')
    await user.click(screen.getByTestId('save-printer'))

    expect(app.printers.getByName('Rig Two')?.extrapolationFactor).toBe(FIXTURE_B_FACTOR)
    expect(screen.getByTestId('next')).toBeEnabled()
    await next(user)
    expect(screen.getByTestId('hero-percentage').textContent).toContain('98.188')
  })
})

describe('every step can be left, and the branch is not a dead end (regressions)', () => {
  /*
   * Both of these were shipped bugs that no unit test could see, because each
   * component behaved correctly in isolation and the mistake was in how they
   * were wired together:
   *
   *   1. C2's `next` is `null` (the branch decides the target), and the chrome
   *      read "no literal next" as "hide Next" — leaving the user stuck on the
   *      second screen of the app with no way forward.
   *   2. Exit was the *fallback* for the Back slot, so it vanished as soon as a
   *      step had a Back: from Q1 onward the only way out was to walk back
   *      through the flow.
   */
  it('advances from the branch step', async () => {
    const app = createTestApp()
    const user = mount(app)

    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)

    expect(screen.getByTestId('next')).toBeDisabled()
    await user.click(screen.getByLabelText(/have not calibrated this printer yet/))
    expect(screen.getByTestId('next')).toBeEnabled()

    await next(user)
    expect(screen.getByLabelText(/Temperature settings/)).toBeInTheDocument()
  })

  it('offers Cancel calibration on a step that has a Back, and asks before leaving', async () => {
    const app = createTestApp()
    const user = mount(app)

    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)
    await user.click(screen.getByLabelText(/have not calibrated this printer yet/))
    await next(user)

    // Q1 has a Back, and still has a way out of the flow without walking it.
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    await user.click(screen.getByTestId('exit'))

    // Asking is unconditional; only the wording reflects an empty draft.
    expect(screen.getByTestId('exit-confirmation')).toHaveTextContent(
      'Nothing has been entered yet',
    )
    await user.click(screen.getByTestId('stay'))
    expect(screen.queryByTestId('exit-confirmation')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('exit'))
    await user.click(screen.getByTestId('leave'))
    expect(screen.getByTestId('start')).toBeInTheDocument()
  })

  it('reaches the printers screen from the branch step and comes back with the new list', async () => {
    const app = createTestApp()
    const user = mount(app)

    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)

    await user.click(screen.getByTestId('open-printers'))
    expect(screen.getByTestId('add-printer')).toBeInTheDocument()

    // Import by hand, then return: the flow is re-entered from the landing screen,
    // and C2 must now offer the single-beam branch (decision 16, 17).
    await user.click(screen.getByTestId('add-printer'))
    await user.type(screen.getByLabelText('Printer name'), 'Rig One')
    await user.type(screen.getByLabelText('Extrapolation factor'), '0.99')
    await user.click(screen.getByTestId('submit-printer'))
    await user.click(screen.getByTestId('back-to-landing'))

    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)
    expect(screen.getByLabelText(/already has a saved factor/)).toBeEnabled()
  })
})

describe('no path discards measurements without asking (T33.5)', () => {
  /*
   * The draft is the only home of the eight readings — nothing is persisted mid
   * flow by design (PRD §12, decision 15). So every departure from the flow has to
   * pass through the confirmation, and there must be no *other* control that
   * navigates away. This walks the controls that exist on a measured step and
   * checks that stepping backwards (which is lossless) never confirms while
   * leaving (which is not) always does — from every screen, whatever the draft
   * happens to hold.
   */
  it('never leaves a measured step without confirming, and never confirms a step back', async () => {
    const app = createTestApp()
    const user = mount(app)

    await runQuadToSaveGate(user) // …through Q6, onto Q7.

    // Q6 is measured, so leaving it confirms.
    await user.click(screen.getByTestId('exit'))
    expect(screen.getByTestId('exit-confirmation')).toBeInTheDocument()
    await user.click(screen.getByTestId('stay'))

    // Back to Q6 is lossless: no dialog, and the readings are still there.
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.queryByTestId('exit-confirmation')).not.toBeInTheDocument()
    expect((screen.getByLabelText(/^Y outer/) as HTMLInputElement).value).toBe('137.0')

    // Back again to Q5 — the first measurement step.
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.queryByTestId('exit-confirmation')).not.toBeInTheDocument()
    expect((screen.getByLabelText(/^X outer/) as HTMLInputElement).value).toBe('138.0')

    // And back to Q4, which is instructional: stepping back never confirms…
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.queryByTestId('exit-confirmation')).not.toBeInTheDocument()

    // …but leaving from here does too: asking is unconditional, so it does not
    // depend on which screen happens to be showing.
    await user.click(screen.getByTestId('exit'))
    expect(screen.getByTestId('exit-confirmation')).toBeInTheDocument()
    await user.click(screen.getByTestId('leave'))
    expect(screen.getByTestId('start')).toBeInTheDocument()

    // And the confirm-every-time rule still holds on the way back in.
    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)
    await user.click(screen.getByLabelText(/have not calibrated this printer yet/))
    await next(user)
    expect(screen.queryByTestId('exit-confirmation')).not.toBeInTheDocument()
  })

  it('offers no way to the printers screen from a measured step', async () => {
    const app = createTestApp()
    const user = mount(app)

    await runQuadToSaveGate(user)

    // The printer detour exists on C2, before anything is measured. On a measured
    // step the navigation controls are Back and Next, with Cancel calibration at
    // the bottom of the step (plus the save button on Q7, which stores the factor
    // rather than navigating away).
    expect(screen.queryByTestId('open-printers')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Saved printers' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByTestId('exit')).toBeInTheDocument()
    expect(screen.getByTestId('next')).toBeInTheDocument()
  })
})

describe('keyboard-only operation (T34.1, T34.2)', () => {
  /** The heading of the step that is showing, found by its marker attribute. */
  const currentHeading = (): HTMLElement | null =>
    document.querySelector<HTMLElement>('[data-step-heading]')

  it('starts a flow from the keyboard and lands on the first step heading', async () => {
    const app = createTestApp()
    const user = mount(app)

    await user.tab()
    expect(document.activeElement).toHaveTextContent('Start a calibration')

    await user.keyboard('{Enter}')
    expect(currentHeading()).toHaveTextContent('Before you start')
    expect(document.activeElement).toBe(currentHeading())
  })

  it('moves focus to each new step heading, and the heading is not a Tab stop', async () => {
    const app = createTestApp()
    const user = mount(app)

    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)

    expect(currentHeading()).toHaveTextContent('First time on this printer?')
    expect(document.activeElement).toBe(currentHeading())

    // Tabbing out of the heading goes into the step's own controls, not to the
    // heading of the next screen: `tabindex="-1"` is programmatic-only.
    await user.tab()
    expect(document.activeElement?.id).toBe('branch-first-time')
  })

  it('toggles every prerequisite with Space and reaches Next without a mouse', async () => {
    const app = createTestApp()
    const user = mount(app)

    await user.click(screen.getByTestId('start'))

    // Focus starts on the heading, so the first Tab reaches the first control.
    await user.tab()
    for (let index = 0; index < 3; index += 1) {
      expect(document.activeElement).toHaveProperty('type', 'checkbox')
      await user.keyboard(' ')
      await user.tab()
    }

    // Third checkbox, then the opt-out, then Next. (C1 has no Back: the
    // navigation row is Next alone.)
    expect(document.activeElement?.id).toBe('dont-ask-again')
    await user.tab()
    expect(document.activeElement).toBe(screen.getByTestId('next'))
    expect(document.activeElement).toBeEnabled()

    // Cancel calibration is at the bottom of the step, after the navigation row,
    // so it is not one stray Tab away from the control that continues.
    await user.tab()
    expect(document.activeElement).toHaveTextContent('Cancel calibration')
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(screen.getByTestId('next'))

    await user.keyboard('{Enter}')
    expect(currentHeading()).toHaveTextContent('First time on this printer?')
  })

  it('keeps the exit confirmation reachable by keyboard, and cancellable with Escape', async () => {
    const app = createTestApp()
    const user = mount(app)

    await runQuadToSaveGate(user)

    await user.click(screen.getByTestId('exit'))
    expect(screen.getByTestId('stay')).toHaveFocus()

    // Escape dismisses the question the safe way: it cancels rather than leaving.
    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('exit-confirmation')).not.toBeInTheDocument()
    expect(currentHeading()).toHaveTextContent('Save the extrapolation factor')

    // And the confirmed-by-keyboard path is Enter on Stay — the safe choice being
    // the default.
    await user.click(screen.getByTestId('exit'))
    await user.keyboard('{Enter}')
    expect(screen.queryByTestId('exit-confirmation')).not.toBeInTheDocument()
    expect(currentHeading()).toHaveTextContent('Save the extrapolation factor')
  })
})

describe('validation is advisory, never destructive (T27.5)', () => {
  it('warns about an implausible reading without blocking the gate', async () => {
    const app = createTestApp()
    const user = mount(app)

    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)
    await user.click(screen.getByLabelText(/have not calibrated this printer yet/))
    await next(user)
    await passFilament(user)
    await tick(user, /no seams on the measured faces/)
    await next(user)
    await tick(user, /cooled it, and removed it without forcing it/)
    await next(user)
    await next(user)

    await measure(user, 'X', ['150.0', '137.0'])

    expect(screen.getByTestId('next')).toBeEnabled()
  })
})

describe('results precision and the clipboard (T29.6)', () => {
  it('scales by an existing slicer value without losing precision', async () => {
    const app = createTestApp()
    const user = mount(app)

    await runQuadToResults(user)

    const field = screen.getByLabelText(/Current XY shrinkage value/)
    await user.clear(field)
    await user.type(field, '98')

    // 0.981875 × 0.98 = 0.9622375 → 96.224% at 3dp, half away from zero.
    expect(screen.getByTestId('hero-percentage').textContent).toContain('96.224')
  })

  it('warns about an unusual slicer value but does not block', async () => {
    const app = createTestApp()
    const user = mount(app)

    await runQuadToResults(user)

    const field = screen.getByLabelText(/Current XY shrinkage value/)
    await user.clear(field)
    await user.type(field, '150')

    expect(screen.getByText(/worth double-checking/)).toBeInTheDocument()
    expect(screen.getByTestId('next')).toBeEnabled()
  })

  it('copies the displayed value to the clipboard', async () => {
    const app = createTestApp()
    const user = mount(app)
    const written: string[] = []
    // jsdom ships no clipboard, and `navigator.clipboard` is a getter there, so
    // it has to be defined rather than assigned.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (text: string) => void written.push(text) },
      configurable: true,
    })

    try {
      await runQuadToResults(user)
      await user.click(screen.getByTestId('copy'))

      // The digits only: a pasted "%" would not parse in the slicer's field.
      expect(written).toEqual(['98.188'])
    } finally {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    }
  })
})

describe('back navigation keeps what was typed (T27.5)', () => {
  it('restores the readings when stepping back into a measurement step', async () => {
    const app = createTestApp()
    const user = mount(app)

    await user.click(screen.getByTestId('start'))
    await passPrerequisites(user)
    await user.click(screen.getByLabelText(/have not calibrated this printer yet/))
    await next(user)
    await passFilament(user)
    await tick(user, /no seams on the measured faces/)
    await next(user)
    await tick(user, /cooled it, and removed it without forcing it/)
    await next(user)
    await next(user)
    await measure(user, 'X', FIXTURE_B.X)
    await next(user)
    expect(screen.getByLabelText(/^Y outer/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect((screen.getByLabelText(/^X outer/) as HTMLInputElement).value).toBe('138.0')
    expect((screen.getByLabelText(/^X inner/) as HTMLInputElement).value).toBe('137.0')
  })
})
