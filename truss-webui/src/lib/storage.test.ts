import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS, STORE_VERSION } from './constants'
import {
  loadPrefs,
  loadPrinters,
  parseImportedPrinters,
  savePrefs,
  savePrinters,
} from './storage'

beforeEach(() => {
  localStorage.clear()
})

describe('loadPrinters', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(loadPrinters()).toEqual({ printers: [], error: false })
  })

  it('loads a valid store', () => {
    const printers = [{ name: 'Bambu P1S', extrapolationFactor: 1.02345 }]
    localStorage.setItem(
      STORAGE_KEYS.printers,
      JSON.stringify({ version: STORE_VERSION, printers }),
    )
    expect(loadPrinters()).toEqual({ printers, error: false })
  })

  it('degrades gracefully on corrupt data without deleting it', () => {
    localStorage.setItem(STORAGE_KEYS.printers, '{not json')
    expect(loadPrinters()).toEqual({ printers: [], error: true })
    expect(localStorage.getItem(STORAGE_KEYS.printers)).toBe('{not json')
  })

  it('rejects a schema-invalid store', () => {
    localStorage.setItem(
      STORAGE_KEYS.printers,
      JSON.stringify({
        version: STORE_VERSION,
        printers: [{ name: '', extrapolationFactor: -1 }],
      }),
    )
    expect(loadPrinters()).toEqual({ printers: [], error: true })
  })
})

describe('savePrinters', () => {
  it('round-trips through loadPrinters', () => {
    const printers = [{ name: 'Voron', extrapolationFactor: 0.999 }]
    expect(savePrinters(printers)).toBe(true)
    expect(loadPrinters().printers).toEqual(printers)
  })
})

describe('prefs', () => {
  it('defaults to false and round-trips', () => {
    expect(loadPrefs()).toEqual({ skipPrerequisiteCheck: false })
    expect(savePrefs({ skipPrerequisiteCheck: true })).toBe(true)
    expect(loadPrefs()).toEqual({ skipPrerequisiteCheck: true })
  })
})

describe('parseImportedPrinters', () => {
  it('rejects malformed files', () => {
    expect(parseImportedPrinters('not json').malformed).toBe(true)
    expect(parseImportedPrinters('{"printers":[]}').malformed).toBe(true)
  })

  it('rejects unknown versions with no printers', () => {
    const result = parseImportedPrinters('{"version":2,"printers":[]}')
    expect(result.versionError).toBe(true)
    expect(result.printers).toEqual([])
    expect(result.malformed).toBe(false)
  })

  it('keeps valid entries and counts invalid ones', () => {
    const json = JSON.stringify({
      version: STORE_VERSION,
      printers: [
        { name: 'A', extrapolationFactor: 1.0 },
        { name: '', extrapolationFactor: 1.0 },
        { name: 'B', extrapolationFactor: -2 },
        { name: 'C', extrapolationFactor: 1.02 },
      ],
    })
    const result = parseImportedPrinters(json)
    expect(result.printers.map((p) => p.name)).toEqual(['A', 'C'])
    expect(result.invalid).toBe(2)
    expect(result.malformed).toBe(false)
    expect(result.versionError).toBe(false)
  })
})
