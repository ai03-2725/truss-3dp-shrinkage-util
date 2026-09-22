import { cleanup, render, screen } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEYS } from './lib/constants'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('Home', () => {
  it('disables the single flow and explains when no printers are saved', () => {
    render(() => <App />)
    expect(
      screen.getByRole('button', { name: /Single-Beam Calibration/ }),
    ).toBeDisabled()
    expect(
      screen.getByText(
        'No saved printers available - Run a quad-beam calibration first or import printers manually.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Manage saved printers' }),
    ).toBeInTheDocument()
  })

  it('warns about corrupt stored printers without deleting them', () => {
    localStorage.setItem(STORAGE_KEYS.printers, '{broken')
    render(() => <App />)
    expect(
      screen.getByText(
        /Saved printers couldn't be read and are shown as empty/,
      ),
    ).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.printers)).toBe('{broken')
  })

  it('warns when browser storage is unavailable and still renders', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    render(() => <App />)
    expect(
      screen.getByText(/Browser storage is unavailable/),
    ).toBeInTheDocument()
    expect(screen.getByText('Truss Shrinkage Calibrator')).toBeInTheDocument()
  })
})
