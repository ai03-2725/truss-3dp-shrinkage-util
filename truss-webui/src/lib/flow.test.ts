import { test } from 'node:test'
import assert from 'node:assert/strict'
import { flowProgress, previousStep } from './flow.ts'

test('quad progress counts all nine steps when the equipment check runs', () => {
  assert.deepEqual(flowProgress('quad-equipment', false), { current: 1, total: 9 })
  assert.deepEqual(flowProgress('quad-result', false), { current: 9, total: 9 })
})

test('quad progress drops the equipment step when it is skipped', () => {
  assert.deepEqual(flowProgress('quad-filament', true), { current: 1, total: 8 })
  assert.deepEqual(flowProgress('quad-result', true), { current: 8, total: 8 })
})

test('quad progress keeps the equipment step while the user is on it', () => {
  assert.deepEqual(flowProgress('quad-equipment', true), { current: 1, total: 9 })
})

test('single progress counts six steps', () => {
  assert.deepEqual(flowProgress('single-printer', false), { current: 1, total: 6 })
  assert.deepEqual(flowProgress('single-result', false), { current: 6, total: 6 })
})

test('progress is null for non-flow screens', () => {
  assert.equal(flowProgress('home', false), null)
  assert.equal(flowProgress('printers', false), null)
})

test('previousStep walks within a flow and stops at the first step', () => {
  assert.equal(previousStep('quad-filament'), 'quad-equipment')
  assert.equal(previousStep('quad-equipment'), null)
  assert.equal(previousStep('single-measure'), 'single-print')
})
