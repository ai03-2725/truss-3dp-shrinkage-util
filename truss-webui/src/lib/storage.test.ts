import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load, save, sanitizeState } from './storage.ts'
import type { StorageApi } from './storage.ts'
import type { PersistedState } from './types.ts'
import { emptyEquipment, emptyQuad, emptySingle, emptyTuning } from './types.ts'

function fakeStore(initial: string | null = null) {
  let data = initial
  let failing = false
  const api: StorageApi = {
    getItem: () => data,
    setItem: (_key, value) => {
      if (failing) throw new Error('quota exceeded')
      data = value
    },
  }
  return { api, failWrites: () => (failing = true), dump: () => data }
}

function midFlowState(): PersistedState {
  const quad = emptyQuad()
  quad.x = { outer: '140.1', inner: '' }
  return {
    printers: [{ name: 'P1S', extrapolationFactor: 1.002 }],
    skipEquipment: true,
    active: {
      flow: 'quad',
      step: 'quad-x',
      selectedPrinterName: '',
      equipment: emptyEquipment(),
      tuning: emptyTuning(),
      quadSaveFailed: false,
      quad,
      single: emptySingle(),
    },
  }
}

test('a saved mid-flow draft is reloaded including partial fields and preference', () => {
  const store = fakeStore()
  assert.equal(save(store.api, midFlowState()), null)

  const loaded = load(store.api)
  assert.equal(loaded.warning, null)
  assert.equal(loaded.state.printers[0].name, 'P1S')
  assert.equal(loaded.state.skipEquipment, true)
  assert.equal(loaded.state.active?.step, 'quad-x')
  assert.equal(loaded.state.active?.quad.x.outer, '140.1')
  assert.equal(loaded.state.active?.quad.x.inner, '')
})

test('reopening after finishing keeps printers but clears the active flow', () => {
  const store = fakeStore()
  const state = midFlowState()
  state.active = null // Finish / confirmed Exit clears only active progress.
  save(store.api, state)

  const loaded = load(store.api)
  assert.equal(loaded.state.active, null)
  assert.equal(loaded.state.printers.length, 1)
  assert.equal(loaded.state.skipEquipment, true)
})

test('malformed or unrecognised saved data resets without throwing', () => {
  const malformed = load(fakeStore('{not json').api)
  assert.notEqual(malformed.warning, null)
  assert.deepEqual(malformed.state.printers, [])

  const sanitized = sanitizeState({
    printers: [
      { name: 'Good', extrapolationFactor: 1 },
      { name: '   ', extrapolationFactor: 2 },
      { name: 'Bad', extrapolationFactor: -1 },
    ],
    skipEquipment: 'yes',
    active: { flow: 'other', step: 'nope' },
  })
  assert.equal(sanitized?.printers.length, 1)
  assert.equal(sanitized?.skipEquipment, false)
  assert.equal(sanitized?.active, null)
})

test('loads an unknown step as no active flow to avoid a broken screen', () => {
  const raw = JSON.stringify({
    printers: [],
    skipEquipment: false,
    active: { flow: 'quad', step: 'quad-does-not-exist', quad: {}, single: {} },
  })
  assert.equal(load(fakeStore(raw).api).state.active, null)
})

test('missing storage or a failed write warns but never throws', () => {
  const missing = load(null)
  assert.equal(missing.warning, 'unavailable')
  assert.equal(save(null, midFlowState()), 'unavailable')

  const store = fakeStore()
  store.failWrites()
  assert.equal(save(store.api, midFlowState()), 'unavailable')
})
