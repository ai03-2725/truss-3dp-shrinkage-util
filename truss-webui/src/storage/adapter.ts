import { createSignal } from 'solid-js'
import { attempt } from '../domain/result'
import type { SchemaCheck, SchemaIssue } from './schema'

/**
 * The storage adapter (PRD §12).
 *
 * Storage is treated as *unreliable by default*, not as a convenience wrapper
 * around `localStorage`. Three facts drive the design:
 *
 * 1. `localStorage` can **throw** rather than return `null` — reading the
 *    property itself can raise a `SecurityError` in a sandboxed or third-party
 *    context, and writes raise `QuotaExceededError` (which is also how Safari's
 *    private mode reports a zero-quota store). So every access is probed and
 *    guarded, and a failure is an expected outcome with a UI consequence rather
 *    than an exception.
 * 2. When storage is unusable the app still has to *work*. It runs on an
 *    in-memory mirror, which keeps a session's edits visible and ordered; only
 *    persistence is lost, and the banner says so.
 * 3. A payload this build cannot read must not be destroyed. Import merges
 *    existing-wins (decision 6), so a corrupt payload **cannot** be restored by
 *    re-importing — overwriting it would be unrecoverable. The raw text is
 *    therefore retained so the export path can still hand it back (T07.4).
 */

export type DegradedReason =
  /** Storage cannot be used at all (blocked, disabled, or absent). */
  | 'unavailable'
  /** A write was rejected for exceeding the store's quota. */
  | 'quota-exceeded'
  /** A write failed for some other reason. */
  | 'write-failed'

export interface DegradedState {
  readonly degraded: boolean
  readonly reason: DegradedReason | null
}

export const HEALTHY: DegradedState = { degraded: false, reason: null }

/** The subset of the `Storage` interface this adapter uses. */
export interface StorageHost {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * The result of reading a key.
 *
 * `corrupt` carries both the raw text and *why* it could not be read, because
 * the two consumers need different halves: the banner/export path needs the raw
 * text, and the import path needs the specific reason.
 */
export type StorageRead<T> =
  | { readonly status: 'ok'; readonly payload: T }
  | { readonly status: 'absent' }
  | {
      readonly status: 'corrupt'
      readonly raw: string
      readonly issue: SchemaIssue
      readonly detail: string
    }

export type StorageWrite =
  { readonly ok: true } | { readonly ok: false; readonly reason: DegradedReason }

export interface StorageAdapter {
  /** Whether writes can actually reach persistent storage. */
  readonly persistent: boolean
  /** Reactive degraded-mode state, read by the persistent banner. */
  degraded(): DegradedState
  read<T>(key: string, check: (value: unknown) => SchemaCheck<T>): StorageRead<T>
  write(key: string, payload: unknown): StorageWrite
  /**
   * Raw text of a payload that could not be read, retained so it stays
   * exportable. `null` when nothing was unreadable for that key.
   */
  retainedRaw(key: string): string | null
}

const PROBE_KEY = 'truss-calibrator:probe'

/**
 * Probe for a usable store without ever throwing (T07.1).
 *
 * Round-trips a value rather than only reading the property: a store can exist
 * and still reject writes, and a probe that only checked for existence would
 * report healthy right up until the first save.
 */
export function detectStorageHost(scope: unknown = globalThis): StorageHost | null {
  // Reaching for the property is itself guarded: in a sandboxed or third-party
  // context the accessor can throw a `SecurityError` before any method is called.
  const located = attempt(() => (scope as { localStorage?: StorageHost } | undefined)?.localStorage)
  if (!located.ok) {
    return null
  }

  const candidate = located.value
  if (
    candidate === null ||
    candidate === undefined ||
    typeof candidate.getItem !== 'function' ||
    typeof candidate.setItem !== 'function' ||
    typeof candidate.removeItem !== 'function'
  ) {
    return null
  }

  const probe = attempt(() => {
    candidate.setItem(PROBE_KEY, '1')
    const roundTripped = candidate.getItem(PROBE_KEY) === '1'
    candidate.removeItem(PROBE_KEY)
    return roundTripped
  })

  return probe.ok && probe.value ? candidate : null
}

/**
 * `QuotaExceededError` under any of its names. Browsers disagree on both `name`
 * and `code` (Firefox uses `NS_ERROR_DOM_QUOTA_REACHED`, older engines use code
 * 22), so all of them are recognised.
 */
function isQuotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }
  const candidate = error as { name?: unknown; code?: unknown }
  return (
    candidate.name === 'QuotaExceededError' ||
    candidate.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    candidate.code === 22
  )
}

export interface StorageAdapterOptions {
  /** Explicit host, for tests. `undefined` means auto-detect. */
  readonly host?: StorageHost | null
}

export function createStorageAdapter(options: StorageAdapterOptions = {}): StorageAdapter {
  const detected = options.host === undefined ? detectStorageHost() : options.host
  const host = detected ?? null

  /** Writes are mirrored here so a degraded session still behaves coherently. */
  const memory = new Map<string, string>()
  /** Raw text of payloads that could not be read (T07.4). */
  const retained = new Map<string, string>()

  const initial: DegradedState = host === null ? { degraded: true, reason: 'unavailable' } : HEALTHY
  const [degraded, setDegraded] = createSignal<DegradedState>(initial)

  const persistent = host !== null

  /**
   * Degradation is one-way for the adapter's lifetime. Recovery is not a thing
   * a page can reliably observe (the user might re-enable site data at any
   * moment, or never), and the banner is specified as *persistent*, so claiming
   * health again mid-session would be a lie the UI then has to retract.
   */
  function degrade(reason: DegradedReason): void {
    if (!degraded().degraded) {
      setDegraded({ degraded: true, reason })
    }
  }

  function readRaw(key: string): string | null {
    if (host === null || degraded().degraded) {
      return memory.get(key) ?? null
    }
    const read = attempt(() => host.getItem(key))
    if (!read.ok) {
      degrade('unavailable')
      return memory.get(key) ?? null
    }
    return read.value
  }

  function writeRaw(key: string, raw: string): StorageWrite {
    memory.set(key, raw)

    if (host === null) {
      return { ok: false, reason: degraded().reason ?? 'unavailable' }
    }
    if (degraded().degraded) {
      // Already degraded: the mirror is the whole store now, and saying
      // otherwise would invite the caller to trust a write that cannot persist.
      return { ok: false, reason: degraded().reason ?? 'unavailable' }
    }

    const written = attempt(() => host.setItem(key, raw))
    if (!written.ok) {
      const reason: DegradedReason = isQuotaError(written.error) ? 'quota-exceeded' : 'write-failed'
      degrade(reason)
      return { ok: false, reason }
    }
    return { ok: true }
  }

  return {
    persistent,

    degraded,

    read<T>(key: string, check: (value: unknown) => SchemaCheck<T>): StorageRead<T> {
      const raw = readRaw(key)
      if (raw === null) {
        return { status: 'absent' }
      }

      const parsed = attempt(() => JSON.parse(raw) as unknown)
      if (!parsed.ok) {
        retained.set(key, raw)
        return {
          status: 'corrupt',
          raw,
          issue: 'not-an-object',
          detail: 'Payload is not valid JSON.',
        }
      }

      const checked = check(parsed.value)
      if (!checked.ok) {
        retained.set(key, raw)
        return { status: 'corrupt', raw, issue: checked.issue, detail: checked.detail }
      }

      return { status: 'ok', payload: checked.value }
    },

    write(key: string, payload: unknown): StorageWrite {
      const serialized = attempt(() => JSON.stringify(payload))
      if (!serialized.ok) {
        // A payload we cannot serialise is a programming error, not a storage
        // failure — and reporting it as a storage failure would send the user
        // looking at their browser settings for our bug.
        throw new Error(`Payload for "${key}" is not serialisable.`)
      }
      return writeRaw(key, serialized.value)
    },

    retainedRaw(key: string): string | null {
      return retained.get(key) ?? null
    },
  }
}

let singleton: StorageAdapter | null = null

/**
 * The app's storage adapter.
 *
 * Lazy so that importing a module that mentions storage does not probe the host
 * as a side effect — which matters for the zero-config embedding contract, where
 * the app may be mounted into a page that forbids storage entirely.
 */
export function appStorage(): StorageAdapter {
  singleton ??= createStorageAdapter()
  return singleton
}

/** Test seam: drop the singleton so the next `appStorage()` re-probes. */
export function resetAppStorage(): void {
  singleton = null
}
