import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addPrinter,
  deletePrinter,
  editPrinter,
  exportJSON,
  hasNameConflict,
  importJSON,
  upsertPrinter,
} from './printers.ts'
import type { Printer } from './types.ts'

const base: Printer[] = [{ name: 'P1S', extrapolationFactor: 1.002 }]

test('add rejects empty and duplicate names, requires a positive factor', () => {
  assert.equal(addPrinter(base, '  ', '1').ok, false)
  assert.equal(addPrinter(base, 'p1s ', '1').ok, false)
  assert.equal(addPrinter(base, 'X1C', '').ok, false)
  assert.equal(addPrinter(base, 'X1C', '0').ok, false)
  assert.equal(addPrinter(base, 'X1C', '-1').ok, false)
  assert.equal(addPrinter(base, 'X1C', 'abc').ok, false)

  const added = addPrinter(base, ' X1C ', '1.000123456789')
  assert.equal(added.ok, true)
  if (added.ok) {
    assert.deepEqual(added.printers[1], { name: 'X1C', extrapolationFactor: 1.000123456789 })
  }
})

test('edit allows rename and blocks duplicates with other rows only', () => {
  const list: Printer[] = [
    { name: 'P1S', extrapolationFactor: 1.002 },
    { name: 'X1C', extrapolationFactor: 0.998 },
  ]
  const dup = editPrinter(list, 1, 'p1s', '0.997')
  assert.equal(dup.ok, false)

  const ok = editPrinter(list, 1, 'x1c', '0.997')
  assert.equal(ok.ok, true)
  if (ok.ok) assert.deepEqual(ok.printers[1], { name: 'x1c', extrapolationFactor: 0.997 })
})

test('delete removes only the requested row', () => {
  const list: Printer[] = [
    { name: 'P1S', extrapolationFactor: 1.002 },
    { name: 'X1C', extrapolationFactor: 0.998 },
  ]
  assert.deepEqual(deletePrinter(list, 0), [{ name: 'X1C', extrapolationFactor: 0.998 }])
})

test('upsert is the only duplicate-allowed path and preserves the saved display name', () => {
  const next = upsertPrinter(base, 'p1s', 1.004)
  assert.deepEqual(next, [{ name: 'P1S', extrapolationFactor: 1.004 }])
  assert.equal(hasNameConflict(base, ' P1S '), true)

  const appended = upsertPrinter(base, 'New', 1.05)
  assert.deepEqual(appended[1], { name: 'New', extrapolationFactor: 1.05 })
})

test('export/import round-trips full precision', () => {
  const value = 1.0001234567890123
  const text = exportJSON([{ name: 'P1S', extrapolationFactor: value }])
  const result = importJSON([], text)
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.printers[0].extrapolationFactor, value)
    assert.deepEqual(result.skipped, [])
  }
})

test('import rejects the whole file on invalid records or unsupported version', () => {
  const snapshot = JSON.stringify(base)
  const badJSON = importJSON(base, '{not json')
  assert.equal(badJSON.ok, false)

  const badVersion = importJSON(base, JSON.stringify({ version: 2, printers: [] }))
  assert.equal(badVersion.ok, false)

  const badName = importJSON(base, JSON.stringify({ version: 1, printers: [{ name: ' ', extrapolationFactor: 1 }] }))
  assert.equal(badName.ok, false)

  const badFactor = importJSON(
    base,
    JSON.stringify({ version: 1, printers: [{ name: 'A', extrapolationFactor: -1 }] }),
  )
  assert.equal(badFactor.ok, false)

  const notList = importJSON(base, JSON.stringify({ version: 1, printers: {} }))
  assert.equal(notList.ok, false)

  // The local list is never mutated by a failed import.
  assert.equal(JSON.stringify(base), snapshot)
})

test('import rejects within-file duplicate names', () => {
  const text = JSON.stringify({
    version: 1,
    printers: [
      { name: 'A', extrapolationFactor: 1 },
      { name: ' a ', extrapolationFactor: 1.1 },
    ],
  })
  assert.equal(importJSON([], text).ok, false)
})

test('import keeps local conflicts and reports skipped names and count', () => {
  const text = JSON.stringify({
    version: 1,
    printers: [
      { name: 'p1s', extrapolationFactor: 1.5 },
      { name: 'New', extrapolationFactor: 1.01 },
    ],
  })
  const result = importJSON(base, text)
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(result.printers, [
      { name: 'P1S', extrapolationFactor: 1.002 },
      { name: 'New', extrapolationFactor: 1.01 },
    ])
    assert.deepEqual(result.skipped, ['p1s'])
    assert.equal(result.skipped.length, 1)
  }
})
