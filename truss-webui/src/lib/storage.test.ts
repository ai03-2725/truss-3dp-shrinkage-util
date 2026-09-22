import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRINTERS_STORAGE_KEY, STORE_VERSION } from './constants'
import {
  loadPrefs,
  loadPrinters,
  mergePrinters,
  parseImportedPrinters,
  savePrefs,
  savePrinters,
} from './storage'

const validPrinter = { name: 'Bambu P1S', extrapolationFactor: 1.02345 }

describe('storage (PRD §7, §15)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('loads an empty list when nothing is stored', () => {
    expect(loadPrinters()).toEqual({ printers: [], error: false })
  })

  it('round-trips saved printers', () => {
    expect(savePrinters([validPrinter])).toBe(true)
    expect(loadPrinters()).toEqual({ printers: [validPrinter], error: false })
  })

  it('reports corrupt data without deleting it', () => {
    localStorage.setItem(PRINTERS_STORAGE_KEY, '{not json')
    const result = loadPrinters()
    expect(result.error).toBe(true)
    expect(result.printers).toEqual([])
    expect(localStorage.getItem(PRINTERS_STORAGE_KEY)).toBe('{not json')
  })

  it('reports invalid entries while keeping valid ones', () => {
    localStorage.setItem(
      PRINTERS_STORAGE_KEY,
      JSON.stringify({
        version: STORE_VERSION,
        printers: [validPrinter, { name: '', extrapolationFactor: 1 }],
      }),
    )
    const result = loadPrinters()
    expect(result.error).toBe(true)
    expect(result.printers).toEqual([validPrinter])
  })

  it('returns safe defaults when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(savePrinters([validPrinter])).toBe(false)
  })

  it('round-trips preferences', () => {
    expect(loadPrefs()).toEqual({ skipPrerequisiteCheck: false })
    expect(savePrefs({ skipPrerequisiteCheck: true })).toBe(true)
    expect(loadPrefs()).toEqual({ skipPrerequisiteCheck: true })
  })
})

describe('import parsing (PRD §15.3)', () => {
  it('rejects malformed JSON and wrong shapes', () => {
    expect(parseImportedPrinters('{oops').malformed).toBe(true)
    expect(parseImportedPrinters('[]').malformed).toBe(true)
  })

  it('rejects unknown and missing versions', () => {
    expect(
      parseImportedPrinters(JSON.stringify({ version: 2, printers: [] }))
        .versionError,
    ).toBe(true)
    expect(
      parseImportedPrinters(JSON.stringify({ printers: [] })).versionError,
    ).toBe(true)
  })

  it('parses valid entries and counts invalid ones', () => {
    const result = parseImportedPrinters(
      JSON.stringify({
        version: STORE_VERSION,
        printers: [
          validPrinter,
          { name: 'Voron', extrapolationFactor: 0.991 },
          { name: '', extrapolationFactor: 1 },
          { name: 'Bad', extrapolationFactor: -2 },
        ],
      }),
    )
    expect(result).toEqual({
      printers: [validPrinter, { name: 'Voron', extrapolationFactor: 0.991 }],
      invalid: 2,
      malformed: false,
      versionError: false,
    })
  })
})

describe('merge (PRD §15.3)', () => {
  it('keeps existing entries on case-insensitive conflicts', () => {
    const result = mergePrinters(
      [validPrinter],
      [
        { name: 'bambu p1s', extrapolationFactor: 9.9 },
        { name: 'Voron', extrapolationFactor: 0.991 },
      ],
    )
    expect(result.duplicates).toBe(1)
    expect(result.printers).toEqual([
      validPrinter,
      { name: 'Voron', extrapolationFactor: 0.991 },
    ])
  })
})
