import { createContext, useContext, type Accessor } from 'solid-js'
import type { LocaleId } from './locale.ts'
import { FALLBACK_LOCALE } from './locale.ts'

// Provided by App so components that do not receive AppApi (Figure, Guide,
// Lightbox, ResultPercent, ConfirmDialog) can still resolve locale messages.
// The context holds the locale accessor so consumers stay reactive.
export const LocaleContext = createContext<Accessor<LocaleId>>(() => FALLBACK_LOCALE)

export function useLocale(): Accessor<LocaleId> {
  return useContext(LocaleContext)
}
