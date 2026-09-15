/**
 * A `Result` for operations that are *expected* to be able to fail.
 *
 * Storage and import are the reason this exists (PRD §12): site data can be
 * unavailable, a payload can be foreign or corrupt, an import file can be
 * subtly wrong. Those are ordinary outcomes the UI must render as messages, not
 * exceptions — and an exception thrown across a component boundary would escape
 * the degraded-mode handling that the whole storage design is built around
 * (T04.5). So the failure path is part of the return type.
 */

export type Result<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok
}

/** Read a result's value, substituting a fallback on failure. */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback
}

/**
 * Run `fn`, converting a thrown value into a failed {@link Result}.
 *
 * Used at the boundary of third-party or host-controlled APIs (`localStorage`,
 * `FileReader`, `navigator.clipboard`) where "can throw" is part of the contract
 * and the caller's intent is to degrade rather than to propagate.
 */
export function attempt<T>(fn: () => T): Result<T, unknown> {
  try {
    return ok(fn())
  } catch (error) {
    return err(error)
  }
}
