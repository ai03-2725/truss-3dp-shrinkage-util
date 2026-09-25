import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  LOCALE_STORAGE_KEY,
  loadManualLocale,
  matchLocale,
  resolveLocale,
  saveManualLocale,
} from './locale.ts'
import type { StorageApi } from './storage.ts'
import { STORAGE_KEY, load, save } from './storage.ts'
import type { PersistedState } from './types.ts'

function fakeStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  let failing = false
  const api: StorageApi = {
    getItem: (key) => {
      if (failing) throw new Error('storage blocked')
      return data.get(key) ?? null
    },
    setItem: (key, value) => {
      if (failing) throw new Error('quota exceeded')
      data.set(key, value)
    },
  }
  return { api, fail: () => (failing = true), get: (key: string) => data.get(key) ?? null }
}

test('a valid saved manual choice wins over every browser preference', () => {
  assert.equal(resolveLocale('ja', ['en-US', 'en']), 'ja')
  assert.equal(resolveLocale('en', ['ja-JP']), 'en')
})

test('walks ordered preferences and matches regional variants by base language', () => {
  assert.equal(resolveLocale(null, ['fr-FR', 'ja-JP', 'en-US']), 'ja')
  assert.equal(resolveLocale(null, ['fr-FR', 'en-US', 'ja-JP']), 'en')
  assert.equal(resolveLocale(null, ['EN_us']), 'en')
  assert.equal(matchLocale('ja-JP'), 'ja')
  assert.equal(matchLocale('en'), 'en')
  assert.equal(matchLocale('de-DE'), null)
})

test('unsupported-only and empty preference lists fall back to English', () => {
  assert.equal(resolveLocale(null, ['fr-FR', 'de-DE']), 'en')
  assert.equal(resolveLocale(null, []), 'en')
  assert.equal(resolveLocale(null), 'en')
})

test('invalid or unusable stored values are treated as unset', () => {
  assert.equal(resolveLocale('klingon', ['ja']), 'ja')
  assert.equal(resolveLocale('', ['ja']), 'ja')
  assert.equal(resolveLocale(undefined, ['ja']), 'ja')
  assert.equal(resolveLocale({} as unknown as string, ['ja']), 'ja')
})

test('manual locale round-trips under its own key', () => {
  const store = fakeStore()
  assert.equal(loadManualLocale(store.api), null)
  saveManualLocale(store.api, 'ja')
  assert.equal(loadManualLocale(store.api), 'ja')
  assert.equal(store.get(LOCALE_STORAGE_KEY), 'ja')
})

test('locale storage never touches calibration progress storage', () => {
  const store = fakeStore()
  saveManualLocale(store.api, 'ja')
  assert.equal(store.get(STORAGE_KEY), null)

  const state: PersistedState = { printers: [], skipEquipment: false, active: null }
  save(store.api, state)
  assert.equal(store.get(LOCALE_STORAGE_KEY), 'ja')
  assert.equal(load(store.api).warning, null)
})

test('storage read/write failures degrade without throwing', () => {
  const store = fakeStore()
  store.fail()
  assert.equal(loadManualLocale(store.api), null)
  assert.doesNotThrow(() => saveManualLocale(store.api, 'ja'))
  assert.equal(loadManualLocale(null), null)
  assert.doesNotThrow(() => saveManualLocale(null, 'ja'))
})
