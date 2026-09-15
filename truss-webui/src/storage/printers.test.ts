import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY_PRINTERS } from '../domain/types'
import { createStorageAdapter, type StorageHost } from './adapter'
import { createPrinterRepository, type PrinterError } from './printers'

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

const X1C = { name: 'X1C', extrapolationFactor: 1.0034215686 }
const VORON = { name: 'Voron 2.4', extrapolationFactor: 0.9981 }

function setup(host: StorageHost | null = new FakeHost()) {
  const storage = createStorageAdapter({ host })
  return { storage, repository: createPrinterRepository(storage) }
}

/** Assert a failed write and hand back the typed error for inspection. */
function expectErr(
  result: ReturnType<ReturnType<typeof createPrinterRepository>['add']>,
): PrinterError {
  expect(result.ok).toBe(false)
  if (result.ok) {
    throw new Error('expected a failure')
  }
  return result.error
}

describe('printer CRUD', () => {
  let host: FakeHost
  let repository: ReturnType<typeof createPrinterRepository>

  beforeEach(() => {
    host = new FakeHost()
    repository = setup(host).repository
  })

  it('starts empty when nothing is stored', () => {
    expect(repository.list()).toEqual([])
    expect(repository.exists('X1C')).toBe(false)
    expect(repository.getByName('X1C')).toBeNull()
  })

  it('adds, lists, and finds a printer', () => {
    const added = repository.add(X1C)
    expect(added.ok).toBe(true)
    if (added.ok) {
      expect(added.value.persisted).toBe(true)
      expect(added.value.record).toEqual(X1C)
    }

    expect(repository.list()).toEqual([X1C])
    expect(repository.getByName('X1C')).toEqual(X1C)
    expect(repository.exists('x1c')).toBe(true)
  })

  it('persists across a fresh repository over the same storage', () => {
    repository.add(X1C)
    const reopened = createPrinterRepository(createStorageAdapter({ host }))
    expect(reopened.list()).toEqual([X1C])
  })

  it('updates both name and factor', () => {
    repository.add(X1C)
    const updated = repository.update('X1C', { name: 'X1 Carbon', extrapolationFactor: 1.0001 })

    expect(updated.ok).toBe(true)
    expect(repository.list()).toEqual([{ name: 'X1 Carbon', extrapolationFactor: 1.0001 }])
    expect(repository.exists('X1C')).toBe(false)
  })

  it('removes a printer', () => {
    repository.add(X1C)
    repository.add(VORON)

    const removed = repository.remove('x1c')
    expect(removed.ok).toBe(true)
    expect(repository.list()).toEqual([VORON])
  })

  it('reports a missing record rather than throwing', () => {
    const missing = expectErr(repository.remove('Nope'))
    expect(missing).toEqual({ kind: 'not-found', name: 'Nope' })

    const update = expectErr(repository.update('Nope', X1C))
    expect(update).toEqual({ kind: 'not-found', name: 'Nope' })
  })

  it('trims the name as it stores it', () => {
    repository.add({ name: '  X1C  ', extrapolationFactor: 1 })
    expect(repository.list()).toEqual([{ name: 'X1C', extrapolationFactor: 1 }])
    expect(repository.getByName('X1C')).not.toBeNull()
  })

  it('replaceAll swaps the whole set', () => {
    repository.add(X1C)
    const replaced = repository.replaceAll([VORON])

    expect(replaced.ok).toBe(true)
    expect(repository.list()).toEqual([VORON])
  })

  it('replaceAll refuses an invalid record without changing anything', () => {
    repository.add(X1C)
    expectErr(repository.replaceAll([VORON, { name: '', extrapolationFactor: 1 }]))
    expect(repository.list()).toEqual([X1C])
  })
})

describe('name uniqueness', () => {
  let repository: ReturnType<typeof createPrinterRepository>

  beforeEach(() => {
    repository = setup().repository
    repository.add({ name: 'Voron 2.4', extrapolationFactor: 1 })
  })

  it.each([
    ['Voron 2.4', 'the identical name'],
    ['voron 2.4', 'a lowercase spelling'],
    ['VORON 2.4', 'an uppercase spelling'],
    ['  Voron 2.4  ', 'surrounding whitespace'],
  ])('blocks %s (%s)', (name) => {
    const collision = expectErr(repository.add({ name, extrapolationFactor: 1.1 }))
    expect(collision.kind).toBe('name-collision')
    if (collision.kind === 'name-collision') {
      // The error carries the stored spelling, which is what the recovery copy
      // has to name (PRD §12: exit, delete *that* record, start over).
      expect(collision.existingName).toBe('Voron 2.4')
      expect(collision.name).toBe(name.trim())
    }
    expect(repository.list()).toHaveLength(1)
  })

  it('allows a record to keep its own name while its factor changes', () => {
    expect(
      repository.update('Voron 2.4', { name: 'Voron 2.4', extrapolationFactor: 1.05 }).ok,
    ).toBe(true)
    expect(repository.list()).toEqual([{ name: 'Voron 2.4', extrapolationFactor: 1.05 }])
  })

  it('allows a rename that only changes letter case', () => {
    expect(repository.update('Voron 2.4', { name: 'VORON 2.4', extrapolationFactor: 1 }).ok).toBe(
      true,
    )
    expect(repository.list()[0].name).toBe('VORON 2.4')
  })

  it('still blocks renaming onto a different record', () => {
    repository.add({ name: 'X1C', extrapolationFactor: 1 })
    const collision = expectErr(
      repository.update('X1C', { name: 'voron 2.4', extrapolationFactor: 1 }),
    )
    expect(collision.kind).toBe('name-collision')
  })

  it('frees a name once the holder is removed', () => {
    repository.remove('Voron 2.4')
    expect(repository.add({ name: 'VORON 2.4', extrapolationFactor: 1 }).ok).toBe(true)
  })
})

describe('validation', () => {
  let repository: ReturnType<typeof createPrinterRepository>

  beforeEach(() => {
    repository = setup().repository
  })

  it.each([
    ['', 'empty'],
    ['   ', 'whitespace only'],
  ])('rejects a %s name (%s)', (name) => {
    expect(expectErr(repository.add({ name, extrapolationFactor: 1 })).kind).toBe('invalid-name')
  })

  it.each([
    [0, 'zero'],
    [-1, 'negative'],
    [Number.NaN, 'NaN'],
    [Number.POSITIVE_INFINITY, 'Infinity'],
    [Number.NEGATIVE_INFINITY, '-Infinity'],
  ])('rejects a factor of %s (%s)', (factor) => {
    expect(expectErr(repository.add({ name: 'X1C', extrapolationFactor: factor })).kind).toBe(
      'invalid-factor',
    )
  })

  it('rejects a factor that arrived as a string', () => {
    // A hand-edited file is the expected source of this; coercing it would make
    // "valid" depend on which serialiser wrote the file.
    expect(
      expectErr(repository.add({ name: 'X1C', extrapolationFactor: '1.0001' as unknown as number }))
        .kind,
    ).toBe('invalid-factor')
  })

  it('reports the name before the factor when both are wrong', () => {
    expect(expectErr(repository.add({ name: '', extrapolationFactor: -1 })).kind).toBe(
      'invalid-name',
    )
  })

  it('leaves the stored list untouched after a rejected write', () => {
    repository.add(X1C)
    expectErr(repository.add({ name: 'Bad', extrapolationFactor: 0 }))
    expect(repository.list()).toEqual([X1C])
  })
})

describe('canonical sort order', () => {
  it('is alphabetical and case-insensitive', () => {
    const { repository } = setup()
    for (const name of ['voron 2.4', 'X1C', 'ender 3', 'Bambu A1']) {
      repository.add({ name, extrapolationFactor: 1 })
    }

    expect(repository.list().map((record) => record.name)).toEqual([
      'Bambu A1',
      'ender 3',
      'voron 2.4',
      'X1C',
    ])
  })

  it('is stable regardless of insertion order', () => {
    const first = setup().repository
    const second = setup().repository
    for (const name of ['c', 'a', 'b']) first.add({ name, extrapolationFactor: 1 })
    for (const name of ['b', 'c', 'a']) second.add({ name, extrapolationFactor: 1 })

    expect(first.list().map((r) => r.name)).toEqual(second.list().map((r) => r.name))
  })

  it('applies to records loaded from storage, not just to new ones', () => {
    const host = new FakeHost()
    host.seed(
      STORAGE_KEY_PRINTERS,
      JSON.stringify({
        version: 1,
        printers: [
          { name: 'zebra', extrapolationFactor: 1 },
          { name: 'Alpha', extrapolationFactor: 1 },
        ],
      }),
    )
    expect(
      setup(host)
        .repository.list()
        .map((r) => r.name),
    ).toEqual(['Alpha', 'zebra'])
  })
})

describe('degraded storage', () => {
  it('still accepts changes, reporting that they were not persisted', () => {
    const { repository } = setup(null)

    const added = repository.add(X1C)
    expect(added.ok).toBe(true)
    if (added.ok) {
      expect(added.value.persisted).toBe(false)
    }

    // The change must be visible: the alternative is an app that appears to
    // ignore the user in exactly the situation PRD §12 says it must keep working.
    expect(repository.list()).toEqual([X1C])
    expect(repository.storage.degraded()).toEqual({ degraded: true, reason: 'unavailable' })
  })

  it('reports a quota failure on the change that triggered it', () => {
    const host = new FakeHost()
    const storage = createStorageAdapter({ host })
    const repository = createPrinterRepository(storage)

    const quota = new Error('quota')
    quota.name = 'QuotaExceededError'
    host.failWrites = quota

    const added = repository.add(X1C)
    expect(added.ok).toBe(true)
    if (added.ok) {
      expect(added.value.persisted).toBe(false)
    }
    expect(repository.list()).toEqual([X1C])
  })

  it('treats a corrupt stored payload as an empty list and keeps the raw text', () => {
    const host = new FakeHost()
    host.seed(STORAGE_KEY_PRINTERS, '{"version":1,"printers":[{"name":"X1C"}]}')
    const { repository, storage } = setup(host)

    expect(repository.list()).toEqual([])
    expect(storage.retainedRaw(STORAGE_KEY_PRINTERS)).toBe(
      '{"version":1,"printers":[{"name":"X1C"}]}',
    )
  })

  it('validates uniqueness against the list even in degraded mode', () => {
    const { repository } = setup(null)
    repository.add(X1C)
    expect(expectErr(repository.add({ name: 'x1c', extrapolationFactor: 2 })).kind).toBe(
      'name-collision',
    )
  })
})
