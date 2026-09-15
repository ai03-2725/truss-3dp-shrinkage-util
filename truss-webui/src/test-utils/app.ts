import { createStorageAdapter, type StorageHost } from '../storage/adapter'
import { createPrinterRepository, type PrinterRepository } from '../storage/printers'
import { createSettingsStore, type SettingsStore } from '../storage/settings'
import { createFlowEngine, type FlowEngine } from '../flow/engine'
import type { StorageAdapter } from '../storage/adapter'

/**
 * The app's dependency graph, assembled for tests.
 *
 * Screens take their collaborators as props rather than reaching for a singleton,
 * so a test can hand them a storage double and assert on what was persisted
 * without touching the environment.
 */

/** A `Storage` double with switchable failure modes. */
export class FakeHost implements StorageHost {
  private readonly entries = new Map<string, string>()
  failWrites: unknown = null
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

  seed(key: string, value: string): void {
    this.entries.set(key, value)
  }

  raw(key: string): string | null {
    return this.entries.get(key) ?? null
  }
}

export interface TestApp {
  readonly host: FakeHost
  readonly storage: StorageAdapter
  readonly printers: PrinterRepository
  readonly settings: SettingsStore
  readonly engine: FlowEngine
}

export interface TestAppOptions {
  /** `null` simulates a browser that forbids storage entirely. */
  readonly host?: FakeHost | null
  readonly skipPrerequisites?: boolean
}

export function createTestApp(options: TestAppOptions = {}): TestApp {
  const host = options.host === undefined ? new FakeHost() : options.host
  const storage = createStorageAdapter({ host })
  const printers = createPrinterRepository(storage)
  const settings = createSettingsStore(storage)

  if (options.skipPrerequisites === true) {
    settings.setSkipPrerequisites(true)
  }

  return {
    host: host ?? new FakeHost(),
    storage,
    printers,
    settings,
    engine: createFlowEngine({ settings }),
  }
}

/** A quota-shaped write failure, which is how private browsing reports itself. */
export function quotaError(): Error {
  const error = new Error('quota')
  error.name = 'QuotaExceededError'
  return error
}
