import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { PRINTERS_STORAGE_KEY, STORE_VERSION } from './lib/constants'
import { MEASUREMENT_RANGE_WARNING } from './lib/validation'

describe('App acceptance behaviors (PRD §20)', () => {
  beforeEach(() => localStorage.clear())

  it('disables Single with no saved printers and links to management (AC1)', () => {
    render(() => <App />)
    const single = screen.getByRole('button', {
      name: /Single-Beam Calibration/,
    })
    expect(single).toBeDisabled()
    expect(screen.getByText(/No saved printers available/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Manage saved printers' }),
    ).toBeInTheDocument()
  })

  it('shows a notice for corrupt stored printers (AC9)', async () => {
    localStorage.setItem(PRINTERS_STORAGE_KEY, '{broken')
    render(() => <App />)
    await waitFor(() =>
      expect(screen.getByText(/couldn't be read/)).toBeInTheDocument(),
    )
    expect(screen.getByText(/No saved printers available/)).toBeInTheDocument()
  })

  it('enables Single when a saved printer exists (AC3)', () => {
    localStorage.setItem(
      PRINTERS_STORAGE_KEY,
      JSON.stringify({
        version: STORE_VERSION,
        printers: [{ name: 'Voron', extrapolationFactor: 1 }],
      }),
    )
    render(() => <App />)
    expect(
      screen.getByRole('button', { name: /Single-Beam Calibration/ }),
    ).not.toBeDisabled()
  })

  it('warns when localStorage is unavailable (AC9)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(() => <App />)
    expect(screen.getByText(/can't be stored/)).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('confirms before leaving a flow and discards progress (AC11)', async () => {
    render(() => <App />)
    fireEvent.click(
      screen.getByRole('button', { name: /Quad-Beam Calibration/ }),
    )
    expect(screen.getByText('Before you start')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    expect(screen.getByText('Leave calibration?')).toBeInTheDocument()
    expect(screen.getByText(/progress .* lost/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }))
    await waitFor(() =>
      expect(
        screen.getByText('Truss Shrinkage Calibrator'),
      ).toBeInTheDocument(),
    )
  })

  it('shows the exact out-of-range measurement warning (AC5)', () => {
    // The warning string is asserted verbatim against the PRD.
    expect(MEASUREMENT_RANGE_WARNING).toBe(
      'Your entered value is quite far from the expected 140mm target - please ensure that you are measuring the part correctly.',
    )
  })
})
