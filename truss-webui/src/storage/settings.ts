import { createSignal } from 'solid-js'
import {
  DEFAULT_SETTINGS,
  PAYLOAD_VERSION,
  STORAGE_KEY_SETTINGS,
  type SettingsState,
} from '../domain/types'
import type { StorageAdapter } from './adapter'
import { checkSettingsPayload } from './schema'

/**
 * The settings store (PRD §9.2, decision 4).
 *
 * One global flag, `skipPrerequisites`, set by the "Don't ask again" control on
 * C1 and changed **only** from the printer-data screen — that screen's toggle is
 * the user's only route back to the prerequisite guidance, so it is deliberately
 * not on the landing page.
 *
 * The subtlety worth getting right: this flag is the one piece of persisted state
 * whose failure is *silent and directional*. If it were applied in memory after a
 * failed write, the checklist would vanish for the session, and the user would
 * have no way to know they had skipped the three hardware checks the rest of the
 * procedure depends on. So unlike the printer repository — where an in-memory
 * change is worth keeping — **the flag only reads as set once it has actually
 * persisted**. A failed "don't ask again" simply does not take effect, and the
 * caller is told so it can keep the control unchecked and explain why.
 */

export interface SettingsChange {
  readonly state: SettingsState
  /** `false` when the change could not be persisted (see the note above). */
  readonly persisted: boolean
}

export interface SettingsStore {
  readonly storage: StorageAdapter
  state(): SettingsState
  skipPrerequisites(): boolean
  setSkipPrerequisites(skip: boolean): SettingsChange
}

export function createSettingsStore(storage: StorageAdapter): SettingsStore {
  function load(): SettingsState {
    const read = storage.read(STORAGE_KEY_SETTINGS, checkSettingsPayload)
    // Absent, corrupt, or foreign all mean "ask the user": the default is the
    // safe direction for a flag that suppresses guidance.
    return read.status === 'ok' ? read.payload : DEFAULT_SETTINGS
  }

  const [state, setState] = createSignal<SettingsState>(load())

  function apply(next: SettingsState): SettingsChange {
    const written = storage.write(STORAGE_KEY_SETTINGS, {
      version: PAYLOAD_VERSION,
      skipPrerequisites: next.skipPrerequisites,
    })

    // Clearing is safe to apply in memory even when it cannot persist: the
    // failure mode of a stale "false" is showing the checklist, which is the
    // default and the harmless direction. Setting is not.
    if (written.ok || !next.skipPrerequisites) {
      setState(next)
    }

    return { state: state(), persisted: written.ok }
  }

  return {
    storage,

    state(): SettingsState {
      return state()
    },

    skipPrerequisites(): boolean {
      return state().skipPrerequisites
    },

    setSkipPrerequisites(skip: boolean): SettingsChange {
      return apply({ skipPrerequisites: skip })
    },
  }
}
