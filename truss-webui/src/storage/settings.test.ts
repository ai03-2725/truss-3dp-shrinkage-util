import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, STORAGE_KEY_SETTINGS } from '../domain/types'
import { createStorageAdapter, type StorageHost } from './adapter'
import { createSettingsStore } from './settings'

class FakeHost implements StorageHost {
  private readonly entries = new Map<string, string>()
  failWrites: unknown = null

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (this.failWrites !== null) {
      throw this.failWrites
    }
    this.entries.set(key, value)
  }

  removeItem(key: string): void {
    this.entries.delete(key)
  }

  seed(key: string, value: string): void {
    this.entries.set(key, value)
  }
}

function setup(host: StorageHost | null = new FakeHost()) {
  const storage = createStorageAdapter({ host })
  return { storage, store: createSettingsStore(storage) }
}

describe('settings store', () => {
  it('defaults to asking the user', () => {
    const { store } = setup()
    expect(store.state()).toEqual(DEFAULT_SETTINGS)
    expect(store.skipPrerequisites()).toBe(false)
  })

  it('persists the flag and reports success', () => {
    const host = new FakeHost()
    const { store } = setup(host)

    expect(store.setSkipPrerequisites(true)).toEqual({
      state: { skipPrerequisites: true },
      persisted: true,
    })
    expect(store.skipPrerequisites()).toBe(true)

    const reopened = createSettingsStore(createStorageAdapter({ host }))
    expect(reopened.skipPrerequisites()).toBe(true)
  })

  it('treats a corrupt payload as unset and keeps the raw text', () => {
    const host = new FakeHost()
    host.seed(STORAGE_KEY_SETTINGS, '{"version":1,"skipPrerequisites":"yes"}')
    const { store, storage } = setup(host)

    expect(store.skipPrerequisites()).toBe(false)
    expect(storage.retainedRaw(STORAGE_KEY_SETTINGS)).not.toBeNull()
  })

  it('ignores a payload written by a future version', () => {
    const host = new FakeHost()
    host.seed(STORAGE_KEY_SETTINGS, JSON.stringify({ version: 99, skipPrerequisites: true }))
    expect(setup(host).store.skipPrerequisites()).toBe(false)
  })

  describe('degraded storage', () => {
    it('never reports the flag as set when it could not be persisted', () => {
      const { store } = setup(null)

      const change = store.setSkipPrerequisites(true)
      expect(change.persisted).toBe(false)
      expect(change.state).toEqual({ skipPrerequisites: false })

      // The whole point: a flag that reads as set would silently remove the
      // prerequisite checklist from the session.
      expect(store.skipPrerequisites()).toBe(false)
    })

    it('still lets the user clear a flag that could not be re-persisted', () => {
      const host = new FakeHost()
      const { store } = setup(host)
      store.setSkipPrerequisites(true)

      const quota = new Error('quota')
      quota.name = 'QuotaExceededError'
      host.failWrites = quota

      const cleared = store.setSkipPrerequisites(false)
      expect(cleared.persisted).toBe(false)
      // Showing the checklist again is the harmless direction, so clearing takes
      // effect even without a successful write.
      expect(store.skipPrerequisites()).toBe(false)
    })
  })
})
