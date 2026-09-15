import { describe, expect, it } from 'vitest'
import { formatFactor } from '../domain/number'
import { PAYLOAD_VERSION, type PrinterRecord } from '../domain/types'
import { checkPrintersPayload } from './schema'
import {
  exportFilename,
  isOversized,
  MAX_IMPORT_BYTES,
  mergePrinters,
  serializePrinters,
} from './transfer'

const X1C: PrinterRecord = { name: 'X1C', extrapolationFactor: 1.0034215686 }
const VORON: PrinterRecord = { name: 'Voron 2.4', extrapolationFactor: 0.9987272727 }

/** Assert a refusal and hand back its specific kind. */
function refusal(text: string, existing: readonly PrinterRecord[] = []) {
  const outcome = mergePrinters(text, existing)
  expect(outcome.ok).toBe(false)
  if (outcome.ok) {
    throw new Error('expected a refusal')
  }
  return outcome.refusal
}

describe('serializePrinters', () => {
  it('produces the PRD shape', () => {
    const parsed = JSON.parse(serializePrinters([X1C])) as unknown

    expect(parsed).toEqual({
      version: PAYLOAD_VERSION,
      printers: [{ name: 'X1C', extrapolationFactor: 1.0034215686 }],
    })
  })

  it('writes full precision, never the 10dp display value', () => {
    // 137.4625 / 137.5 has no short decimal form; the displayed 10dp value would
    // silently degrade the factor on every round trip (T10.2).
    const factor = 137.4625 / 137.5
    const text = serializePrinters([{ name: 'X1C', extrapolationFactor: factor }])
    const parsed = JSON.parse(text) as { printers: { extrapolationFactor: number }[] }
    const token = /"extrapolationFactor": ([^,\n]+)/.exec(text)?.[1]

    expect(parsed.printers[0].extrapolationFactor).toBe(factor)
    expect(token).toBe('0.9997272727272728')
    expect(token).not.toBe(formatFactor(factor))
  })

  it('round-trips an awkward double exactly', () => {
    const factor = 0.1 + 0.2
    const text = serializePrinters([{ name: 'X1C', extrapolationFactor: factor }])
    const parsed = JSON.parse(text) as { printers: { extrapolationFactor: number }[] }

    expect(parsed.printers[0].extrapolationFactor).toBe(factor)
  })

  it('is indented so the file stays hand-editable', () => {
    expect(serializePrinters([X1C])).toContain('\n  "printers"')
  })

  it('excludes the prerequisites flag, which is app state', () => {
    expect(serializePrinters([X1C])).not.toContain('skipPrerequisites')
  })

  it('writes an empty list as a valid empty payload', () => {
    expect(checkPrintersPayload(JSON.parse(serializePrinters([]))).ok).toBe(true)
  })
})

describe('exportFilename', () => {
  it('is truss-printers-YYYY-MM-DD.json', () => {
    expect(exportFilename(new Date(2026, 8, 16))).toBe('truss-printers-2026-09-16.json')
  })

  it('zero-pads single-digit months and days', () => {
    expect(exportFilename(new Date(2026, 0, 5))).toBe('truss-printers-2026-01-05.json')
  })
})

describe('mergePrinters', () => {
  it('adds records that do not exist yet', () => {
    const outcome = mergePrinters(serializePrinters([X1C, VORON]), [])

    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.added).toEqual(['X1C', 'Voron 2.4'])
      expect(outcome.skipped).toEqual([])
      expect(outcome.merged).toEqual([X1C, VORON])
    }
  })

  it('keeps existing values and skips the conflict', () => {
    const stored: PrinterRecord = { name: 'X1C', extrapolationFactor: 1.5 }
    const outcome = mergePrinters(serializePrinters([X1C, VORON]), [stored])

    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.added).toEqual(['Voron 2.4'])
      expect(outcome.skipped).toEqual(['X1C'])
      // Existing values always win — the file's 1.0034 must not replace 1.5.
      expect(outcome.merged.find((r) => r.name === 'X1C')).toEqual(stored)
    }
  })

  it('treats a name clash as a clash regardless of case or whitespace', () => {
    const outcome = mergePrinters(serializePrinters([{ name: '  x1c ', extrapolationFactor: 2 }]), [
      X1C,
    ])
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.added).toEqual([])
      expect(outcome.skipped).toEqual(['x1c'])
    }
  })

  it('skips the second of two same-named records within one file', () => {
    const outcome = mergePrinters(
      serializePrinters([
        { name: 'X1C', extrapolationFactor: 1 },
        { name: 'x1c', extrapolationFactor: 2 },
      ]),
      [],
    )

    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.added).toEqual(['X1C'])
      expect(outcome.skipped).toEqual(['x1c'])
      expect(outcome.merged).toHaveLength(1)
      expect(outcome.merged[0].extrapolationFactor).toBe(1)
    }
  })

  it('is a no-op when exporting and immediately re-importing', () => {
    const existing = [VORON, X1C]
    const outcome = mergePrinters(serializePrinters(existing), existing)

    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.added).toEqual([])
      expect(outcome.skipped).toEqual(['Voron 2.4', 'X1C'])
      expect(outcome.merged).toEqual(existing)
    }
  })

  it('round-trips a full-precision factor without drift', () => {
    const factor = 137.4625 / 137.5
    const existing: PrinterRecord[] = [{ name: 'X1C', extrapolationFactor: factor }]

    const outcome = mergePrinters(serializePrinters([]), existing)
    expect(outcome.ok).toBe(true)

    const readBack = mergePrinters(serializePrinters(existing), [])
    expect(readBack.ok).toBe(true)
    if (readBack.ok) {
      expect(readBack.merged[0].extrapolationFactor).toBe(factor)
    }
  })

  it('accepts an empty file as a valid, empty merge', () => {
    const outcome = mergePrinters(serializePrinters([]), [X1C])

    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.merged).toEqual([X1C])
      expect(outcome.added).toEqual([])
      expect(outcome.skipped).toEqual([])
    }
  })
})

describe('import refusals are distinct', () => {
  it('reports unparseable text as invalid-json', () => {
    expect(refusal('{ oops').kind).toBe('invalid-json')
  })

  it('reports an empty file as invalid-json rather than as an empty merge', () => {
    expect(refusal('').kind).toBe('invalid-json')
  })

  it('reports a non-object payload as not-an-object', () => {
    expect(refusal('[1,2,3]').kind).toBe('not-an-object')
    expect(refusal('"printers"').kind).toBe('not-an-object')
  })

  it('reports an unknown version as unsupported-version', () => {
    const result = refusal(JSON.stringify({ version: 2, printers: [] }))
    expect(result.kind).toBe('unsupported-version')
    if (result.kind === 'unsupported-version') {
      expect(result.detail).toContain('2')
    }
  })

  it('reports a missing printers array as malformed', () => {
    expect(refusal(JSON.stringify({ version: PAYLOAD_VERSION })).kind).toBe('malformed')
  })

  it('reports an unusable record as invalid-record and refuses the whole file', () => {
    const text = JSON.stringify({
      version: PAYLOAD_VERSION,
      printers: [X1C, { name: '', extrapolationFactor: 1 }],
    })
    const result = refusal(text, [])

    expect(result.kind).toBe('invalid-record')
    if (result.kind === 'invalid-record') {
      expect(result.detail).toContain('2')
    }
  })

  it.each([
    ['a non-numeric factor', { name: 'X', extrapolationFactor: '1.0' }],
    ['a zero factor', { name: 'X', extrapolationFactor: 0 }],
    ['a negative factor', { name: 'X', extrapolationFactor: -1 }],
    ['a missing factor', { name: 'X' }],
    ['a missing name', { extrapolationFactor: 1 }],
    ['a blank name', { name: '   ', extrapolationFactor: 1 }],
    ['a non-object record', 42],
  ])('refuses %s', (_label, record) => {
    const text = JSON.stringify({ version: PAYLOAD_VERSION, printers: [record] })
    expect(refusal(text).kind).toBe('invalid-record')
  })

  it('refuses an oversized payload without parsing it', () => {
    const text = 'x'.repeat(MAX_IMPORT_BYTES + 1)
    const result = refusal(text)

    expect(result.kind).toBe('too-large')
    if (result.kind === 'too-large') {
      expect(result.bytes).toBe(MAX_IMPORT_BYTES + 1)
      expect(result.limit).toBe(MAX_IMPORT_BYTES)
    }
  })

  it('accepts a payload exactly at the limit', () => {
    // Guards the boundary: the check is `>`, not `>=`.
    expect(mergePrinters(serializePrinters([]), []).ok).toBe(true)
    expect(isOversized(MAX_IMPORT_BYTES)).toBe(false)
    expect(isOversized(MAX_IMPORT_BYTES + 1)).toBe(true)
  })

  it('never applies a partial import', () => {
    const stored: PrinterRecord[] = [{ name: 'Existing', extrapolationFactor: 1 }]
    const text = JSON.stringify({
      version: PAYLOAD_VERSION,
      printers: [X1C, { name: 'Bad', extrapolationFactor: Infinity }],
    })

    // Infinity is not representable in JSON at all, so this arrives as null.
    const result = refusal(text, stored)
    expect(result.kind).toBe('invalid-record')
    if (result.kind !== 'too-large') {
      expect(result).not.toHaveProperty('merged')
    }
  })
})
