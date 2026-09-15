import { render, screen, within } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY_PRINTERS } from '../domain/types'
import { serializePrinters } from '../storage/transfer'
import { createTestApp, FakeHost, quotaError, type TestApp } from '../test-utils/app'
import { Landing, PrinterData } from './screens'

/**
 * Landing (T17) and printer-data (T18–T23) tests.
 */

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPrinterData(app: TestApp = createTestApp()) {
  const utils = render(() => (
    <PrinterData engine={app.engine} printers={app.printers} settings={app.settings} />
  ))
  return { app, ...utils }
}

/** Capture downloads: jsdom has no object URLs and does not navigate. */
function captureDownloads(): { readonly files: { name: string; blob: Blob }[] } {
  const files: { name: string; blob: Blob }[] = []
  const blobs = new Map<string, Blob>()

  Object.assign(URL, {
    createObjectURL: vi.fn((blob: Blob) => {
      const url = `blob:mock-${blobs.size}`
      blobs.set(url, blob)
      return url
    }),
    revokeObjectURL: vi.fn(),
  })

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const blob = blobs.get(this.href)
    if (blob !== undefined) {
      files.push({ name: this.download, blob })
    }
  })

  return { files }
}

async function blobText(blob: Blob): Promise<string> {
  return blob.text()
}

describe('landing screen (T17)', () => {
  it('offers the two entry actions and nothing else', () => {
    const app = createTestApp()
    render(() => <Landing engine={app.engine} />)

    expect(screen.getByTestId('start')).toBeInTheDocument()
    expect(screen.getByTestId('printers')).toBeInTheDocument()
  })

  it('starts the calibration flow', async () => {
    const user = userEvent.setup()
    const app = createTestApp()
    render(() => <Landing engine={app.engine} />)

    await user.click(screen.getByTestId('start'))

    expect(app.engine.screen()).toBe('flow')
    expect(app.engine.step()?.id).toBe('C1')
  })

  it('opens the printer-data screen', async () => {
    const user = userEvent.setup()
    const app = createTestApp()
    render(() => <Landing engine={app.engine} />)

    await user.click(screen.getByTestId('printers'))
    expect(app.engine.screen()).toBe('printers')
  })

  it('does not link out to the written guides (§13.4)', () => {
    const app = createTestApp()
    const { container } = render(() => <Landing engine={app.engine} />)

    // Embedding is the reason: an outbound link would be the first thing to break
    // in a host page that owns its own navigation.
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })
})

describe('printer list (T18)', () => {
  it('shows an empty state that points at importing', () => {
    renderPrinterData()

    expect(screen.getByTestId('empty-state')).toHaveTextContent('import')
  })

  it('lists printers with their factor at display precision, in canonical order', () => {
    const app = createTestApp()
    app.printers.add({ name: 'voron 2.4', extrapolationFactor: 0.9987272727 })
    app.printers.add({ name: 'X1C', extrapolationFactor: 1.0034215686 })
    renderPrinterData(app)

    const items = within(screen.getByTestId('printer-list')).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('voron 2.4')
    expect(items[1]).toHaveTextContent('X1C')
    // The stored value is full precision; the 10dp display is what is shown.
    expect(items[1]).toHaveTextContent('1.0034215686')
  })

  it('returns to the landing page (decision 17)', async () => {
    const user = userEvent.setup()
    const { app } = renderPrinterData()
    app.engine.goToPrinters()

    await user.click(screen.getByTestId('back-to-landing'))
    expect(app.engine.screen()).toBe('landing')
  })
})

describe('adding a printer manually (T19)', () => {
  it('saves a valid printer', async () => {
    const user = userEvent.setup()
    const { app } = renderPrinterData()

    await user.click(screen.getByTestId('add-printer'))
    await user.type(screen.getByLabelText('Printer name'), 'X1C')
    await user.clear(screen.getByLabelText('Extrapolation factor'))
    await user.type(screen.getByLabelText('Extrapolation factor'), '1.0034215686')
    await user.click(screen.getByTestId('submit-printer'))

    expect(app.printers.list()).toEqual([{ name: 'X1C', extrapolationFactor: 1.0034215686 }])
    expect(screen.getByTestId('printer-list')).toHaveTextContent('X1C')
  })

  it('warns on the factor field that the value should come from a quad calibration', async () => {
    const user = userEvent.setup()
    renderPrinterData()

    await user.click(screen.getByTestId('add-printer'))

    expect(screen.getByTestId('factor-warning')).toHaveTextContent('quad')
    // A hand-typed factor is indistinguishable on screen from a measured one, so
    // the field has to say which it should be.
    expect(screen.getByTestId('factor-warning')).toHaveTextContent('extrapolated')
  })

  it('refuses a blank name and a non-positive factor', async () => {
    const user = userEvent.setup()
    const { app } = renderPrinterData()

    await user.click(screen.getByTestId('add-printer'))
    await user.clear(screen.getByLabelText('Extrapolation factor'))
    await user.type(screen.getByLabelText('Extrapolation factor'), '0')

    expect(screen.getByText('Give the printer a name.')).toBeInTheDocument()
    expect(screen.getByText('The factor must be greater than zero.')).toBeInTheDocument()
    expect(screen.getByTestId('submit-printer')).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(app.printers.list()).toEqual([])
  })

  it('reports a duplicate name specifically', async () => {
    const user = userEvent.setup()
    const app = createTestApp()
    app.printers.add({ name: 'X1C', extrapolationFactor: 1 })
    renderPrinterData(app)

    await user.click(screen.getByTestId('add-printer'))
    await user.type(screen.getByLabelText('Printer name'), 'x1c')
    await user.click(screen.getByTestId('submit-printer'))

    expect(screen.getByTestId('printer-status')).toHaveTextContent('already saved')
    expect(app.printers.list()).toHaveLength(1)
  })
})

describe('editing a printer (T20)', () => {
  it('changes both the name and the factor', async () => {
    const user = userEvent.setup()
    const app = createTestApp()
    app.printers.add({ name: 'X1C', extrapolationFactor: 1 })
    renderPrinterData(app)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Printer name'))
    await user.type(screen.getByLabelText('Printer name'), 'X1 Carbon')
    await user.clear(screen.getByLabelText('Extrapolation factor'))
    await user.type(screen.getByLabelText('Extrapolation factor'), '1.05')
    await user.click(screen.getByTestId('submit-printer'))

    expect(app.printers.list()).toEqual([{ name: 'X1 Carbon', extrapolationFactor: 1.05 }])
  })

  it('carries the same factor warning as adding', async () => {
    const user = userEvent.setup()
    const app = createTestApp()
    app.printers.add({ name: 'X1C', extrapolationFactor: 1 })
    renderPrinterData(app)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByTestId('factor-warning')).toHaveTextContent('quad')
  })

  it('blocks renaming onto another printer', async () => {
    const user = userEvent.setup()
    const app = createTestApp()
    app.printers.add({ name: 'X1C', extrapolationFactor: 1 })
    app.printers.add({ name: 'Voron', extrapolationFactor: 2 })
    renderPrinterData(app)

    await user.click(
      within(screen.getByTestId('printer-list')).getAllByRole('button', { name: 'Edit' })[1],
    )
    await user.clear(screen.getByLabelText('Printer name'))
    await user.type(screen.getByLabelText('Printer name'), 'voron')
    await user.click(screen.getByTestId('submit-printer'))

    expect(screen.getByTestId('printer-status')).toHaveTextContent('unique')
    expect(app.printers.list().map((p) => p.name)).toEqual(['Voron', 'X1C'])
  })

  it('cancels without changing anything', async () => {
    const user = userEvent.setup()
    const app = createTestApp()
    app.printers.add({ name: 'X1C', extrapolationFactor: 1 })
    renderPrinterData(app)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Printer name'))
    await user.type(screen.getByLabelText('Printer name'), 'Something else')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(app.printers.list()).toEqual([{ name: 'X1C', extrapolationFactor: 1 }])
  })
})

describe('deleting a printer (T21)', () => {
  it('asks first, and saying no keeps it', async () => {
    const user = userEvent.setup()
    const app = createTestApp()
    app.printers.add({ name: 'X1C', extrapolationFactor: 1 })
    renderPrinterData(app)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmation = screen.getByRole('group', { name: 'Confirm deleting X1C' })
    expect(confirmation).toHaveTextContent('cannot be undone')

    await user.click(within(confirmation).getByRole('button', { name: 'Keep' }))
    expect(app.printers.list()).toHaveLength(1)
    expect(screen.queryByRole('group', { name: 'Confirm deleting X1C' })).toBeNull()
  })

  it('deletes once confirmed', async () => {
    const user = userEvent.setup()
    const app = createTestApp()
    app.printers.add({ name: 'X1C', extrapolationFactor: 1 })
    renderPrinterData(app)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByTestId('confirm-delete-X1C'))

    expect(app.printers.list()).toEqual([])
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('explains that deleting is how an import conflict is resolved', async () => {
    const user = userEvent.setup()
    const app = createTestApp()
    app.printers.add({ name: 'X1C', extrapolationFactor: 1 })
    renderPrinterData(app)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('group', { name: 'Confirm deleting X1C' })).toHaveTextContent(
      'never overwrites',
    )
  })
})

describe('prerequisites reset (T22)', () => {
  it('says the checklist is skipped, then brings it back for the next run', async () => {
    const user = userEvent.setup()
    const app = createTestApp({ skipPrerequisites: true })
    renderPrinterData(app)

    expect(screen.getByTestId('prereq-state')).toHaveTextContent('currently skipped')

    await user.click(screen.getByTestId('reset-prereq'))

    expect(app.settings.skipPrerequisites()).toBe(false)
    expect(screen.getByTestId('prereq-state')).toHaveTextContent('will be shown')

    app.engine.startCalibration()
    expect(app.engine.step()?.id).toBe('C1')
  })

  it('shows the control only when the flag is set', () => {
    renderPrinterData()
    expect(screen.queryByTestId('reset-prereq')).toBeNull()
  })
})

describe('export and import (T23)', () => {
  it('downloads truss-printers-YYYY-MM-DD.json with full-precision factors', async () => {
    const user = userEvent.setup()
    const downloads = captureDownloads()
    const app = createTestApp()
    const factor = 137.4625 / 137.5
    app.printers.add({ name: 'X1C', extrapolationFactor: factor })
    renderPrinterData(app)

    await user.click(screen.getByTestId('export'))

    expect(downloads.files).toHaveLength(1)
    expect(downloads.files[0].name).toMatch(/^truss-printers-\d{4}-\d{2}-\d{2}\.json$/)

    const text = await blobText(downloads.files[0].blob)
    const parsed = JSON.parse(text) as { printers: { extrapolationFactor: number }[] }
    expect(parsed.printers[0].extrapolationFactor).toBe(factor)
  })

  it('imports a file, reporting what was added and what was skipped', async () => {
    const user = userEvent.setup()
    const app = createTestApp()
    app.printers.add({ name: 'X1C', extrapolationFactor: 1 })
    renderPrinterData(app)

    const file = new File(
      [
        serializePrinters([
          { name: 'X1C', extrapolationFactor: 9 },
          { name: 'Voron', extrapolationFactor: 2 },
        ]),
      ],
      'printers.json',
      { type: 'application/json' },
    )
    await user.upload(screen.getByTestId('import-input'), file)

    await vi.waitFor(() =>
      expect(screen.getByTestId('printer-status')).toHaveTextContent('1 added'),
    )
    expect(screen.getByTestId('printer-status')).toHaveTextContent('skipped (already saved): X1C')
    // Existing values always win.
    expect(app.printers.getByName('X1C')?.extrapolationFactor).toBe(1)
    expect(app.printers.getByName('Voron')?.extrapolationFactor).toBe(2)
  })

  it.each([
    ['not JSON at all', 'nonsense', /not valid JSON/],
    ['the wrong shape', '{"version":1}', /missing part of its structure/],
    ['a newer version', '{"version":2,"printers":[]}', /newer version/],
    [
      'an unusable record',
      '{"version":1,"printers":[{"name":"","extrapolationFactor":1}]}',
      /Nothing was imported/,
    ],
  ])('refuses %s with its own reason', async (_label, contents, expected) => {
    const user = userEvent.setup()
    const app = createTestApp()
    renderPrinterData(app)

    await user.upload(
      screen.getByTestId('import-input'),
      new File([contents], 'printers.json', { type: 'application/json' }),
    )

    await vi.waitFor(() => expect(screen.getByTestId('printer-status')).toHaveTextContent(expected))
    expect(app.printers.list()).toEqual([])
  })

  it('refuses an oversized file before reading it', async () => {
    const user = userEvent.setup()
    const app = createTestApp()
    renderPrinterData(app)

    const huge = new File(['x'.repeat(1024)], 'huge.json', { type: 'application/json' })
    Object.defineProperty(huge, 'size', { value: 6 * 1024 * 1024 })

    await user.upload(screen.getByTestId('import-input'), huge)

    await vi.waitFor(() =>
      expect(screen.getByTestId('printer-status')).toHaveTextContent('probably not the right file'),
    )
  })

  it('states the existing-wins consequence and the workaround', () => {
    renderPrinterData()

    expect(screen.getByText(/saved values always win/i)).toBeInTheDocument()
    expect(screen.getByText(/delete those printers here first/i)).toBeInTheDocument()
  })
})

describe('degraded storage on the printer screen', () => {
  it('shows a persistent banner and still allows changes', async () => {
    const user = userEvent.setup()
    const app = createTestApp({ host: null })
    renderPrinterData(app)

    expect(screen.getByTestId('degraded-banner')).toHaveTextContent(
      "won't be saved".replace("'", '’'),
    )

    await user.click(screen.getByTestId('add-printer'))
    await user.type(screen.getByLabelText('Printer name'), 'X1C')
    await user.click(screen.getByTestId('submit-printer'))

    // The change is visible, and the status says it was not persisted.
    expect(screen.getByTestId('printer-list')).toHaveTextContent('X1C')
    expect(screen.getByTestId('printer-status')).toHaveTextContent('not saved')
  })

  it('reports a quota failure on the change that hit it', async () => {
    const user = userEvent.setup()
    const host = new FakeHost()
    const app = createTestApp({ host })
    renderPrinterData(app)

    host.failWrites = quotaError()
    await user.click(screen.getByTestId('add-printer'))
    await user.type(screen.getByLabelText('Printer name'), 'X1C')
    await user.click(screen.getByTestId('submit-printer'))

    expect(screen.getByTestId('printer-status')).toHaveTextContent('not saved')
    expect(screen.getByTestId('degraded-banner')).toBeInTheDocument()
  })

  it('offers the unreadable payload for export instead of destroying it', async () => {
    const user = userEvent.setup()
    const downloads = captureDownloads()
    const host = new FakeHost()
    host.seed(STORAGE_KEY_PRINTERS, '{"version":1,"printers":[{"name":"X1C"}')
    const app = createTestApp({ host })
    renderPrinterData(app)

    expect(screen.getByTestId('corrupt-banner')).toBeInTheDocument()
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()

    await user.click(screen.getByTestId('export-unreadable'))

    expect(downloads.files).toHaveLength(1)
    expect(downloads.files[0].name).toMatch(/-unreadable\.json$/)
    expect(await blobText(downloads.files[0].blob)).toBe('{"version":1,"printers":[{"name":"X1C"}')
    // Nothing overwrote it.
    expect(host.raw(STORAGE_KEY_PRINTERS)).toBe('{"version":1,"printers":[{"name":"X1C"}')
  })
})
