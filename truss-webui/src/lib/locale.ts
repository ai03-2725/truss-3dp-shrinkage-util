// Locale resolution and independent persistence.
// The manual choice lives under its own key so it can never leak into
// calibration progress or printer export JSON. All storage access is wrapped
// so an unavailable/failing store degrades to an in-memory session choice.

import type { StorageApi } from './storage.ts'

export const SUPPORTED_LOCALES = ['en', 'ja'] as const
export type LocaleId = (typeof SUPPORTED_LOCALES)[number]

export const FALLBACK_LOCALE: LocaleId = 'en'
export const LOCALE_STORAGE_KEY = 'truss-calibrator-locale'

// Native names for the choices, shown in either UI language.
export const LOCALE_NAMES: Record<LocaleId, string> = { en: 'English', ja: '日本語' }

export function isLocaleId(value: unknown): value is LocaleId {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

// Match a BCP-47 tag by base language: "ja-JP" -> "ja", "EN_us" -> "en".
export function matchLocale(tag: string): LocaleId | null {
  const base = tag.trim().toLowerCase().split(/[-_]/)[0]
  return isLocaleId(base) ? base : null
}

// A valid stored manual choice always wins. Otherwise walk the ordered browser
// preferences and take the first supported base language. Unknown/empty lists
// fall back to English. An invalid stored value is treated as unset.
export function resolveLocale(
  stored: string | null | undefined,
  preferred: readonly string[] = [],
): LocaleId {
  if (isLocaleId(stored)) return stored
  for (const tag of preferred) {
    const match = matchLocale(tag)
    if (match) return match
  }
  return FALLBACK_LOCALE
}

// The ordered browser preference list, falling back to a single language.
export function browserPreferredLanguages(): string[] {
  try {
    if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
      return [...navigator.languages]
    }
    return navigator.language ? [navigator.language] : []
  } catch {
    return []
  }
}

export function loadManualLocale(store: StorageApi | null): string | null {
  if (!store) return null
  try {
    return store.getItem(LOCALE_STORAGE_KEY)
  } catch {
    return null
  }
}

// Only called for an explicit user selection, never for browser detection.
export function saveManualLocale(store: StorageApi | null, locale: LocaleId): void {
  if (!store) return
  try {
    store.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Storage is unavailable; the in-memory choice still applies this session.
  }
}
