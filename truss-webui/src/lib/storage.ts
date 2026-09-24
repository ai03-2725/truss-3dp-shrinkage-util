// Browser-storage persistence with an injectable surface so resume/clear failure
// behavior can be tested without a DOM. Never throws to callers.

import type { ActiveCalibration, PersistedState, Printer, QuadInput, SingleInput } from './types.ts'
import { emptyQuad, emptySingle } from './types.ts'
import { isKnownStep } from './flow.ts'
import { normalizeName } from './calc.ts'

export const STORAGE_KEY = 'truss-calibrator-v1'

export const STORAGE_WARNING =
  'Browser storage is unavailable. Your progress and printer profiles may not survive closing or refreshing the app. You can still calibrate and note the results down manually.'

export interface StorageApi {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface LoadOutcome {
  state: PersistedState
  warning: string | null
}

export function defaultState(): PersistedState {
  return { printers: [], skipEquipment: false, active: null }
}

function sanitizePrinters(value: unknown): Printer[] {
  if (!Array.isArray(value)) return []
  const printers: Printer[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const { name, extrapolationFactor } = entry as { name?: unknown; extrapolationFactor?: unknown }
    if (typeof name !== 'string' || !normalizeName(name)) continue
    if (typeof extrapolationFactor !== 'number' || !Number.isFinite(extrapolationFactor) || extrapolationFactor <= 0) {
      continue
    }
    printers.push({ name: normalizeName(name), extrapolationFactor })
  }
  return printers
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function sanitizeQuad(value: unknown): QuadInput {
  const draft = emptyQuad()
  if (typeof value !== 'object' || value === null) return draft
  const input = value as Partial<QuadInput>
  const beams = ['x', 'y', 'a', 'b'] as const
  for (const beam of beams) {
    const reading = input[beam]
    if (typeof reading === 'object' && reading !== null) {
      draft[beam] = { outer: asString(reading.outer), inner: asString(reading.inner) }
    }
  }
  draft.printerName = asString(input.printerName)
  draft.currentXY = asString(input.currentXY, '100') || '100'
  return draft
}

function sanitizeSingle(value: unknown): SingleInput {
  const draft = emptySingle()
  if (typeof value !== 'object' || value === null) return draft
  const input = value as Partial<SingleInput>
  draft.outer = asString(input.outer)
  draft.inner = asString(input.inner)
  draft.currentXY = asString(input.currentXY, '100') || '100'
  return draft
}

function sanitizeActive(value: unknown): ActiveCalibration | null {
  if (typeof value !== 'object' || value === null) return null
  const active = value as Partial<ActiveCalibration>
  if (active.flow !== 'quad' && active.flow !== 'single') return null
  if (typeof active.step !== 'string' || !isKnownStep(active.step)) return null
  const equipment = active.equipment
  const tuning = active.tuning
  return {
    flow: active.flow,
    step: active.step,
    selectedPrinterName: asString(active.selectedPrinterName),
    equipment: {
      calipers: equipment?.calipers === true,
      printer: equipment?.printer === true,
      slicer: equipment?.slicer === true,
    },
    tuning: {
      temperature: tuning?.temperature === true,
      pressure: tuning?.pressure === true,
      flow: tuning?.flow === true,
    },
    quadSaveFailed: active.quadSaveFailed === true,
    quad: sanitizeQuad(active.quad),
    single: sanitizeSingle(active.single),
  }
}

export function sanitizeState(value: unknown): PersistedState | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const record = value as Partial<PersistedState>
  return {
    printers: sanitizePrinters(record.printers),
    skipEquipment: record.skipEquipment === true,
    active: sanitizeActive(record.active),
  }
}

export function load(store: StorageApi | null): LoadOutcome {
  if (!store) return { state: defaultState(), warning: STORAGE_WARNING }
  let raw: string | null
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch {
    return { state: defaultState(), warning: STORAGE_WARNING }
  }
  if (raw === null) return { state: defaultState(), warning: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { state: defaultState(), warning: 'Saved data could not be read and was reset.' }
  }
  const state = sanitizeState(parsed)
  if (!state) return { state: defaultState(), warning: 'Saved data was malformed and was reset.' }
  return { state, warning: null }
}

export function save(store: StorageApi | null, state: PersistedState): string | null {
  if (!store) return STORAGE_WARNING
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state))
    return null
  } catch {
    return STORAGE_WARNING
  }
}

// Access window.localStorage without letting a SecurityError escape.
export function browserStorage(): StorageApi | null {
  try {
    const probe = '__truss_probe__'
    window.localStorage.setItem(probe, probe)
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}
