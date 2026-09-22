import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { STORAGE_KEYS, STORE_VERSION } from '../../lib/constants'

function click(name: string | RegExp) {
  fireEvent.click(screen.getByRole('button', { name }))
}

function check(label: string | RegExp) {
  fireEvent.click(screen.getByLabelText(label))
}

function type(label: string | RegExp, value: string) {
  fireEvent.input(screen.getByLabelText(label), { target: { value } })
}

/** Walk Q1-Q5 (the instructional screens) by checking boxes and continuing. */
function passPrerequisites() {
  click(/Quad-Beam Calibration/)
  check(/digital calipers/)
  check(/functional, calibrated modern printer/)
  check(/modern slicer/)
  click('Continue')

  check(/Temperature settings/)
  check(/Pressure Advance/)
  check(/Flow rate/)
  click('Continue')
  click('Continue')
  click('Continue')
  click('Continue')
}

const VALID = '138.6'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('Quad flow', () => {
  it('walks the full flow and computes a correct final value', () => {
    render(() => <App />)
    passPrerequisites()

    // Q6
    expect(screen.getByText('Measure the X-beam')).toBeInTheDocument()
    type('X - Outer', VALID)
    type('X - Inner', VALID)
    click('Continue')

    // Q7
    for (const axis of ['Y', 'A', 'B']) {
      type(`${axis} - Outer`, VALID)
      type(`${axis} - Inner`, VALID)
    }
    click('Continue')

    // Q8 - factor is 1.0 for uniform measurements
    expect(screen.getByText('Your extrapolation factor')).toBeInTheDocument()
    type('Name this printer', 'Test Printer')
    click('Save & Continue')

    // Q9 - ratio 0.99, 100% stays 99
    expect(screen.getByText('Calibrating on Test Printer')).toBeInTheDocument()
    expect(screen.getByText('99')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Back' }),
    ).not.toBeInTheDocument()
    click('Finish')
    expect(screen.getByText('Truss Shrinkage Calibrator')).toBeInTheDocument()

    // Printer persisted for the single flow
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.printers) ?? '{}',
    )
    expect(stored.printers).toEqual([
      { name: 'Test Printer', extrapolationFactor: 1 },
    ])
  })

  it('skips Q1 and recounts steps when the preference is set', () => {
    localStorage.setItem(
      STORAGE_KEYS.prefs,
      JSON.stringify({ skipPrerequisiteCheck: true }),
    )
    render(() => <App />)
    click(/Quad-Beam Calibration/)
    expect(screen.getByText('Tune the filament first')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument()
  })

  it('warns on out-of-range measurements but does not block Continue', () => {
    render(() => <App />)
    passPrerequisites()
    type('X - Outer', '130')
    type('X - Inner', '130')
    expect(
      screen.getAllByText(
        'Your entered value is quite far from the expected 140mm target - please ensure that you are measuring the part correctly.',
      ).length,
    ).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  })

  it('confirms before discarding an in-progress flow', () => {
    render(() => <App />)
    passPrerequisites()
    click('Exit')
    expect(screen.getByText('Leave calibration?')).toBeInTheDocument()
    click('Discard and leave')
    expect(screen.getByText('Truss Shrinkage Calibrator')).toBeInTheDocument()
  })

  it('returns to Home on reload, discarding measurements', () => {
    render(() => <App />)
    passPrerequisites()
    expect(screen.getByText('Measure the X-beam')).toBeInTheDocument()
    cleanup()
    render(() => <App />)
    expect(screen.getByText('Truss Shrinkage Calibrator')).toBeInTheDocument()
    expect(screen.queryByText('Measure the X-beam')).not.toBeInTheDocument()
  })

  it('seeds a printer for the single flow from storage', () => {
    localStorage.setItem(
      STORAGE_KEYS.printers,
      JSON.stringify({
        version: STORE_VERSION,
        printers: [{ name: 'Seeded', extrapolationFactor: 1.02 }],
      }),
    )
    render(() => <App />)
    expect(
      screen.getByRole('button', { name: /Single-Beam Calibration/ }),
    ).toBeEnabled()
  })
})
