import { describe, expect, it } from 'vitest'
import { STORE_VERSION } from './constants'
import { buildExportJson, exportFilename } from './export'

describe('export helpers (PRD §7.3)', () => {
  it('builds a versioned payload', () => {
    const json = buildExportJson([
      { name: 'Voron', extrapolationFactor: 0.991 },
    ])
    expect(JSON.parse(json)).toEqual({
      version: STORE_VERSION,
      printers: [{ name: 'Voron', extrapolationFactor: 0.991 }],
    })
  })

  it('names the file with a timestamp', () => {
    const name = exportFilename(new Date(2024, 0, 2, 3, 4, 5))
    expect(name).toBe('truss-printers-20240102-030405.json')
  })
})
