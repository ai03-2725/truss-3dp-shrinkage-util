import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { PRINTERS_STORAGE_KEY, STORE_VERSION } from '../lib/constants'
import { savePrinters } from '../lib/storage'
import type { Printer } from '../lib/types'
import { ManagePrinters } from './ManagePrinters'

function Harness(props: { initial: Printer[] }) {
  const [printers, setPrinters] = createSignal(props.initial)
  const commit = (next: Printer[]) => {
    setPrinters(next)
    savePrinters(next)
  }
  return (
    <ManagePrinters
      printers={printers()}
      onAdd={(printer) => commit([...printers(), printer])}
      onUpdate={(original, printer) =>
        commit(printers().map((p) => (p.name === original ? printer : p)))
      }
      onDelete={(name) => commit(printers().filter((p) => p.name !== name))}
      onSetPrinters={commit}
      onBack={() => {}}
    />
  )
}

const storedPrinters = (): Printer[] => {
  const raw = localStorage.getItem(PRINTERS_STORAGE_KEY)
  return raw ? (JSON.parse(raw).printers as Printer[]) : []
}

describe('ManagePrinters (PRD §12)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('adds a printer and persists it', async () => {
    render(() => <Harness initial={[]} />)
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Add printer' }))
    fireEvent.input(screen.getByLabelText('Printer name'), {
      target: { value: 'Bambu P1S' },
    })
    fireEvent.input(screen.getByLabelText('Extrapolation factor'), {
      target: { value: '1.02345' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(screen.getByText('Bambu P1S')).toBeInTheDocument(),
    )
    expect(storedPrinters()).toEqual([
      { name: 'Bambu P1S', extrapolationFactor: 1.02345 },
    ])
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })

  it('blocks duplicate names case-insensitively', () => {
    render(() => (
      <Harness initial={[{ name: 'Bambu P1S', extrapolationFactor: 1 }]} />
    ))
    fireEvent.click(screen.getByRole('button', { name: 'Add printer' }))
    fireEvent.input(screen.getByLabelText('Printer name'), {
      target: { value: 'bambu p1s' },
    })
    fireEvent.input(screen.getByLabelText('Extrapolation factor'), {
      target: { value: '1.0' },
    })
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('edits a printer and persists the change', async () => {
    render(() => (
      <Harness initial={[{ name: 'Voron', extrapolationFactor: 0.99 }]} />
    ))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.input(screen.getByLabelText('Extrapolation factor'), {
      target: { value: '1.05' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(storedPrinters()[0].extrapolationFactor).toBe(1.05),
    )
    expect(screen.getByText('Voron')).toBeInTheDocument()
  })

  it('deletes a printer after confirmation', async () => {
    render(() => (
      <Harness initial={[{ name: 'Voron', extrapolationFactor: 0.99 }]} />
    ))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const confirm = screen
      .getAllByRole('button', { name: 'Delete' })
      .at(-1) as HTMLElement
    fireEvent.click(confirm)
    await waitFor(() => expect(storedPrinters()).toEqual([]))
    expect(screen.queryByText('Voron')).toBeNull()
  })

  it('imports valid printers, skips duplicates and reports a summary', async () => {
    render(() => (
      <Harness initial={[{ name: 'Bambu P1S', extrapolationFactor: 1 }]} />
    ))
    const file = new File(
      [
        JSON.stringify({
          version: STORE_VERSION,
          printers: [
            { name: 'bambu p1s', extrapolationFactor: 9 },
            { name: 'Voron', extrapolationFactor: 0.99 },
            { name: '', extrapolationFactor: 1 },
          ],
        }),
      ],
      'printers.json',
      { type: 'application/json' },
    )
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await waitFor(() =>
      expect(
        screen.getByText(/Imported 1, skipped 1 duplicate, 1 invalid/),
      ).toBeInTheDocument(),
    )
    expect(storedPrinters().map((p) => p.name)).toEqual(['Bambu P1S', 'Voron'])
  })

  it('rejects an unknown export version without changing state', async () => {
    render(() => <Harness initial={[]} />)
    const file = new File(
      [
        JSON.stringify({
          version: 99,
          printers: [{ name: 'X', extrapolationFactor: 1 }],
        }),
      ],
      'printers.json',
      { type: 'application/json' },
    )
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await waitFor(() =>
      expect(screen.getByText(/unsupported version/)).toBeInTheDocument(),
    )
    expect(storedPrinters()).toEqual([])
  })
})
