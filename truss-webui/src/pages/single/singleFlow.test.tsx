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

function seedPrinter() {
  localStorage.setItem(
    STORAGE_KEYS.printers,
    JSON.stringify({
      version: STORE_VERSION,
      printers: [{ name: 'Test Printer', extrapolationFactor: 1.02 }],
    }),
  )
}

beforeEach(() => {
  localStorage.clear()
  seedPrinter()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('Single flow', () => {
  it('walks the flow using the stored factor and computes the extrapolated value', () => {
    render(() => <App />)
    click(/Single-Beam Calibration/)

    // S1 - select the printer
    expect(screen.getByText('Select your printer')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Test Printer'))
    click('Continue')

    // S2 - filament tuning
    expect(screen.getByText('Calibrating on Test Printer')).toBeInTheDocument()
    check(/Temperature settings/)
    check(/Pressure Advance/)
    check(/Flow rate/)
    click('Continue')

    // S3, S4
    click('Continue')
    click('Continue')

    // S5 - single beam measurement: avg 140 -> ratio 1.0 * 1.02 = 1.02
    type('Outer', '141')
    type('Inner', '139')
    click('Continue')

    // S6
    expect(screen.getByText('Calibrating on Test Printer')).toBeInTheDocument()
    expect(screen.getByText('102')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Back' }),
    ).not.toBeInTheDocument()
    click('Finish')
    expect(screen.getByText('Truss Shrinkage Calibrator')).toBeInTheDocument()
  })

  it('confirms before discarding and keeps the selection across Back', () => {
    render(() => <App />)
    click(/Single-Beam Calibration/)
    fireEvent.click(screen.getByLabelText('Test Printer'))
    click('Continue')

    // Exit confirmation mid-flow.
    click('Exit')
    expect(screen.getByText('Leave calibration?')).toBeInTheDocument()
    click('Keep calibrating')
    expect(screen.getByText('Tune the filament first')).toBeInTheDocument()

    // Back to S1 retains the selection.
    click('Back')
    expect(screen.getByText('Select your printer')).toBeInTheDocument()
    expect(screen.getByLabelText('Test Printer')).toBeChecked()
  })

  it('updates the final value live as the current percentage changes', () => {
    render(() => <App />)
    click(/Single-Beam Calibration/)
    fireEvent.click(screen.getByLabelText('Test Printer'))
    click('Continue')
    check(/Temperature settings/)
    check(/Pressure Advance/)
    check(/Flow rate/)
    click('Continue')
    click('Continue')
    click('Continue')
    type('Outer', '140')
    type('Inner', '140')
    click('Continue')

    // ratio = 1.0 * 1.02 = 1.02; 100% -> 102
    expect(screen.getByText('102')).toBeInTheDocument()
    type('Current XY shrinkage %', '50')
    expect(screen.getByText('51')).toBeInTheDocument()
  })
})
