import { beforeEach, describe, expect, it } from 'vitest'
import { PAYLOAD_VERSION, STORAGE_KEY_PRINTERS, STORAGE_KEY_SETTINGS } from '../domain/types'
import {
  appStorage,
  createStorageAdapter,
  detectStorageHost,
  resetAppStorage,
  type StorageHost,
} from './adapter'
import { checkPrintersPayload, checkSettingsPayload } from './schema'

/** A `Storage` double whose failure modes are switchable mid-test. */
class FakeHost implements StorageHost {
  private readonly entries = new Map<string, string>()
  /** When set, `setItem` throws this value. */
  failWrites: unknown = null
  /** When true, `getItem` throws (a blocked/partitioned store). */
  failReads = false

  getItem(key: string): string | null {
    if (this.failReads) {
      throw new Error('storage access is blocked')
    }
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

  /** Put a value in place without going through the adapter. */
  seed(key: string, value: string): void {
    this.entries.set(key, value)
  }

  has(key: string): boolean {
    return this.entries.has(key)
  }
}

const PRINTERS_PAYLOAD = {
  version: PAYLOAD_VERSION,
  printers: [{ name: 'X1C', extrapolationFactor: 1.0034215686 }],
}

describe('detectStorageHost', () => {
  it('accepts a host that can round-trip a probe value', () => {
    expect(detectStorageHost({ localStorage: new FakeHost() })).not.toBeNull()
  })

  it('rejects a scope with no localStorage', () => {
    expect(detectStorageHost({})).toBeNull()
    expect(detectStorageHost({ sessionStorage: new FakeHost() })).toBeNull()
  })

  it('defaults to the real global scope', () => {
    // jsdom provides a working localStorage, so the default argument must find
    // it: this is the path every real browser takes.
    expect(detectStorageHost()).not.toBeNull()
  })

  it('rejects a host that cannot be written to, even though it can be read', () => {
    // The probe round-trips on purpose: a store that answers reads but rejects
    // writes would otherwise look healthy right up to the first save.
    const host = new FakeHost()
    host.failWrites = new Error('read-only store')
    expect(detectStorageHost({ localStorage: host })).toBeNull()
  })

  it('survives a localStorage accessor that throws', () => {
    const scope = {
      get localStorage(): StorageHost {
        throw new Error('SecurityError')
      },
    }
    expect(detectStorageHost(scope)).toBeNull()
  })

  it('rejects a scope whose localStorage is not a Storage-like object', () => {
    expect(detectStorageHost({ localStorage: {} })).toBeNull()
    expect(detectStorageHost({ localStorage: null })).toBeNull()
  })
})

describe('typed read and write', () => {
  let host: FakeHost
  let adapter: ReturnType<typeof createStorageAdapter>

  beforeEach(() => {
    host = new FakeHost()
    adapter = createStorageAdapter({ host })
  })

  it('round-trips a printers payload', () => {
    expect(adapter.write(STORAGE_KEY_PRINTERS, PRINTERS_PAYLOAD)).toEqual({ ok: true })

    const read = adapter.read(STORAGE_KEY_PRINTERS, checkPrintersPayload)
    expect(read.status).toBe('ok')
    if (read.status === 'ok') {
      expect(read.payload).toEqual(PRINTERS_PAYLOAD)
    }
  })

  it('round-trips a settings payload', () => {
    adapter.write(STORAGE_KEY_SETTINGS, { version: PAYLOAD_VERSION, skipPrerequisites: true })

    const read = adapter.read(STORAGE_KEY_SETTINGS, checkSettingsPayload)
    expect(read.status).toBe('ok')
    if (read.status === 'ok') {
      expect(read.payload.skipPrerequisites).toBe(true)
    }
  })

  it('reports an unused key as absent rather than corrupt', () => {
    expect(adapter.read(STORAGE_KEY_PRINTERS, checkPrintersPayload)).toEqual({ status: 'absent' })
    expect(adapter.retainedRaw(STORAGE_KEY_PRINTERS)).toBeNull()
  })

  it('reports junk as corrupt and retains the raw text for export', () => {
    host.seed(STORAGE_KEY_PRINTERS, '{ not json')

    const read = adapter.read(STORAGE_KEY_PRINTERS, checkPrintersPayload)
    expect(read.status).toBe('corrupt')
    if (read.status === 'corrupt') {
      expect(read.issue).toBe('not-an-object')
      expect(read.raw).toBe('{ not json')
    }
    expect(adapter.retainedRaw(STORAGE_KEY_PRINTERS)).toBe('{ not json')
  })

  it('reports an unsupported version distinctly from a malformed payload', () => {
    host.seed(STORAGE_KEY_PRINTERS, JSON.stringify({ version: PAYLOAD_VERSION + 1, printers: [] }))
    const unsupported = adapter.read(STORAGE_KEY_PRINTERS, checkPrintersPayload)
    expect(unsupported.status === 'corrupt' && unsupported.issue).toBe('unsupported-version')

    host.seed(STORAGE_KEY_PRINTERS, JSON.stringify({ version: PAYLOAD_VERSION, printers: 'nope' }))
    const malformed = adapter.read(STORAGE_KEY_PRINTERS, checkPrintersPayload)
    expect(malformed.status === 'corrupt' && malformed.issue).toBe('malformed')

    host.seed(
      STORAGE_KEY_PRINTERS,
      JSON.stringify({
        version: PAYLOAD_VERSION,
        printers: [{ name: '  ', extrapolationFactor: 1 }],
      }),
    )
    const invalidRecord = adapter.read(STORAGE_KEY_PRINTERS, checkPrintersPayload)
    expect(invalidRecord.status === 'corrupt' && invalidRecord.issue).toBe('invalid-record')
  })

  it('treats a foreign payload as empty rather than as data', () => {
    host.seed(STORAGE_KEY_PRINTERS, JSON.stringify({ some: 'other app' }))

    const read = adapter.read(STORAGE_KEY_PRINTERS, checkPrintersPayload)
    expect(read.status).toBe('corrupt')
  })
})

describe('degraded mode: storage unavailable', () => {
  it('runs on the in-memory mirror, reporting the failure to the caller', () => {
    const adapter = createStorageAdapter({ host: null })

    expect(adapter.persistent).toBe(false)
    expect(adapter.degraded()).toEqual({ degraded: true, reason: 'unavailable' })

    const written = adapter.write(STORAGE_KEY_PRINTERS, PRINTERS_PAYLOAD)
    expect(written).toEqual({ ok: false, reason: 'unavailable' })

    // The write is not persisted, but it must not vanish either: a session where
    // adding a printer appears to do nothing is worse than one that says so.
    const read = adapter.read(STORAGE_KEY_PRINTERS, checkPrintersPayload)
    expect(read.status).toBe('ok')
  })

  it('starts empty, since there was nowhere to have stored anything', () => {
    const adapter = createStorageAdapter({ host: null })
    expect(adapter.read(STORAGE_KEY_PRINTERS, checkPrintersPayload)).toEqual({ status: 'absent' })
  })
})

describe('degraded mode: failed writes', () => {
  it('classifies a quota error and keeps the value in memory', () => {
    const host = new FakeHost()
    const adapter = createStorageAdapter({ host })

    const quotaError = new Error('quota')
    quotaError.name = 'QuotaExceededError'
    host.failWrites = quotaError

    expect(adapter.write(STORAGE_KEY_PRINTERS, PRINTERS_PAYLOAD)).toEqual({
      ok: false,
      reason: 'quota-exceeded',
    })
    expect(adapter.degraded()).toEqual({ degraded: true, reason: 'quota-exceeded' })

    const read = adapter.read(STORAGE_KEY_PRINTERS, checkPrintersPayload)
    expect(read.status).toBe('ok')
  })

  it('recognises the Firefox quota error name and the legacy code', () => {
    const host = new FakeHost()
    const adapter = createStorageAdapter({ host })

    const firefox = new Error('quota')
    firefox.name = 'NS_ERROR_DOM_QUOTA_REACHED'
    host.failWrites = firefox
    expect(adapter.write(STORAGE_KEY_PRINTERS, PRINTERS_PAYLOAD)).toEqual({
      ok: false,
      reason: 'quota-exceeded',
    })
  })

  it('classifies any other write failure as write-failed', () => {
    const host = new FakeHost()
    const adapter = createStorageAdapter({ host })
    host.failWrites = new Error('disk on fire')

    expect(adapter.write(STORAGE_KEY_PRINTERS, PRINTERS_PAYLOAD)).toEqual({
      ok: false,
      reason: 'write-failed',
    })
  })

  it('degrades one-way: later writes keep failing even if the host recovers', () => {
    const host = new FakeHost()
    const adapter = createStorageAdapter({ host })
    host.failWrites = new Error('transient')

    expect(adapter.write(STORAGE_KEY_PRINTERS, PRINTERS_PAYLOAD).ok).toBe(false)

    host.failWrites = null
    // The banner is specified as persistent and a page cannot reliably observe
    // recovery, so the adapter stays honest about not persisting.
    expect(adapter.write(STORAGE_KEY_PRINTERS, PRINTERS_PAYLOAD)).toEqual({
      ok: false,
      reason: 'write-failed',
    })
  })

  it('falls back to the mirror when a read throws', () => {
    const host = new FakeHost()
    host.seed(STORAGE_KEY_PRINTERS, JSON.stringify(PRINTERS_PAYLOAD))
    const adapter = createStorageAdapter({ host })

    expect(adapter.read(STORAGE_KEY_PRINTERS, checkPrintersPayload).status).toBe('ok')

    // Once the store becomes unreadable, the last known value is gone rather
    // than crashing — and the banner explains why.
    const fresh = createStorageAdapter({ host: null })
    host.failReads = true
    expect(adapter.degraded().degraded).toBe(false)
    expect(adapter.read(STORAGE_KEY_PRINTERS, checkPrintersPayload).status).toBe('absent')
    expect(adapter.degraded()).toEqual({ degraded: true, reason: 'unavailable' })
    expect(fresh.persistent).toBe(false)
  })
})

describe('serialisation failures', () => {
  it('throws a programming-error message rather than reporting a storage fault', () => {
    const adapter = createStorageAdapter({ host: new FakeHost() })
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic

    expect(() => adapter.write(STORAGE_KEY_PRINTERS, cyclic)).toThrow(/not serialisable/)
  })
})

describe('appStorage singleton', () => {
  beforeEach(() => {
    resetAppStorage()
  })

  it('returns the same adapter across calls, so the banner shares one signal', () => {
    expect(appStorage()).toBe(appStorage())
  })

  it('is rebuilt after a reset', () => {
    const first = appStorage()
    resetAppStorage()
    expect(appStorage()).not.toBe(first)
  })
})

describe('schema checks are shared with the import path', () => {
  it('rejects a payload whose version is not a number', () => {
    const result = checkPrintersPayload({ version: '1', printers: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issue).toBe('unsupported-version')
      expect(result.detail).toContain('"1"')
    }
  })

  it('accepts an empty printer list', () => {
    const result = checkPrintersPayload({ version: PAYLOAD_VERSION, printers: [] })
    expect(result.ok).toBe(true)
  })

  it('ignores unknown extra keys so hand-edited files stay readable', () => {
    const result = checkPrintersPayload({
      version: PAYLOAD_VERSION,
      printers: [{ name: 'X1C', extrapolationFactor: 1.0001, note: 'bought 2024' }],
      exportedBy: 'hand',
    })
    expect(result.ok).toBe(true)
  })

  it('rejects a settings payload whose flag is not a boolean', () => {
    const result = checkSettingsPayload({ version: PAYLOAD_VERSION, skipPrerequisites: 'yes' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issue).toBe('malformed')
    }
  })
})
