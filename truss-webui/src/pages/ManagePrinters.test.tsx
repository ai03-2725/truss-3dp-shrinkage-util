import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { STORAGE_KEYS, STORE_VERSION } from '../lib/constants'

function openManage() {
  fireEvent.click(screen.getByRole('button', { name: 'Manage saved printers' }))
}

function addPrinter(name: string, factor: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Add printer' }))
  fireEvent.input(screen.getByLabelText('Printer name'), {
    target: { value: name },
  })
  fireEvent.input(screen.getByLabelText('Extrapolation factor'), {
    target: { value: factor },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
}

function storedPrinters() {
  const raw = localStorage.getItem(STORAGE_KEYS.printers)
  return raw ? JSON.parse(raw).printers : []
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ManagePrinters', () => {
  it('adds, edits and deletes a printer, persisting each change', () => {
    render(() => <App />)
    openManage()

    addPrinter('Bambu P1S', '1.02')
    expect(screen.getByText('Bambu P1S')).toBeInTheDocument()
    expect(storedPrinters()).toEqual([
      { name: 'Bambu P1S', extrapolationFactor: 1.02 },
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.input(screen.getByLabelText('Printer name'), {
      target: { value: 'Bambu X1C' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Bambu X1C')).toBeInTheDocument()
    expect(storedPrinters()).toEqual([
      { name: 'Bambu X1C', extrapolationFactor: 1.02 },
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    fireEvent.click(deleteButtons[deleteButtons.length - 1])
    expect(screen.queryByText('Bambu X1C')).not.toBeInTheDocument()
    expect(storedPrinters()).toEqual([])
  })

  it('blocks case-insensitive duplicate names but allows self-rename', () => {
    render(() => <App />)
    openManage()
    addPrinter('Bambu P1S', '1.02')

    fireEvent.click(screen.getByRole('button', { name: 'Add printer' }))
    fireEvent.input(screen.getByLabelText('Printer name'), {
      target: { value: 'bambu p1s' },
    })
    fireEvent.input(screen.getByLabelText('Extrapolation factor'), {
      target: { value: '1.03' },
    })
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    // Editing the existing record with its own name is allowed.
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  })

  it('hides export when empty and downloads a timestamped backup otherwise', () => {
    render(() => <App />)
    openManage()
    expect(
      screen.queryByRole('button', { name: 'Export' }),
    ).not.toBeInTheDocument()

    addPrinter('Voron', '0.99')
    const clicked: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this)
    })
    ;(URL as unknown as { createObjectURL: () => string }).createObjectURL =
      vi.fn(() => 'blob:mock')
    ;(URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL =
      vi.fn()

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    expect(clicked).toHaveLength(1)
    expect(clicked[0].href).toBe('blob:mock')
    expect(clicked[0].download).toMatch(/^truss-printers-\d{8}-\d{6}\.json$/)
  })

  it('imports partially, keeping existing entries on conflict', async () => {
    localStorage.setItem(
      STORAGE_KEYS.printers,
      JSON.stringify({
        version: STORE_VERSION,
        printers: [{ name: 'Existing', extrapolationFactor: 1.01 }],
      }),
    )
    render(() => <App />)
    openManage()

    const json = JSON.stringify({
      version: STORE_VERSION,
      printers: [
        { name: 'existing', extrapolationFactor: 9.99 },
        { name: 'New', extrapolationFactor: 1.02 },
        { name: 'bad', extrapolationFactor: -1 },
      ],
    })
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File([json], 'printers.json', { type: 'application/json' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)

    await waitFor(() =>
      expect(
        screen.getByText('Imported 1, skipped 1 duplicate, 1 invalid.'),
      ).toBeInTheDocument(),
    )
    expect(storedPrinters()).toEqual([
      { name: 'Existing', extrapolationFactor: 1.01 },
      { name: 'New', extrapolationFactor: 1.02 },
    ])
  })

  it('rejects unknown versions without changing stored data', async () => {
    localStorage.setItem(
      STORAGE_KEYS.printers,
      JSON.stringify({
        version: STORE_VERSION,
        printers: [{ name: 'Existing', extrapolationFactor: 1.01 }],
      }),
    )
    render(() => <App />)
    openManage()

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(['{"version":99,"printers":[]}'], 'future.json', {
      type: 'application/json',
    })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)

    await waitFor(() =>
      expect(
        screen.getByText('That backup was created by an unsupported version.'),
      ).toBeInTheDocument(),
    )
    expect(storedPrinters()).toEqual([
      { name: 'Existing', extrapolationFactor: 1.01 },
    ])
  })
})
