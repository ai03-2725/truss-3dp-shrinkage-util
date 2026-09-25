import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import type { AppApi } from '../lib/app-api.ts'
import { LOCALE_NAMES, SUPPORTED_LOCALES, type LocaleId } from '../lib/locale.ts'
import { messages } from '../lib/messages.ts'
import { Icon } from './Icon.tsx'
import { icons } from '../lib/icons.ts'

// Compact globe button that opens a small popover of radio choices. Selecting a
// language applies immediately and closes the popover. Built on native radios
// so keyboard, touch, and screen-reader support come from the platform.
export function LocaleSwitcher(props: { app: AppApi }) {
  const [open, setOpen] = createSignal(false)
  let root!: HTMLDivElement
  let button!: HTMLButtonElement
  const t = () => messages(props.app.locale())

  const close = (refocus = false) => {
    setOpen(false)
    if (refocus) button.focus()
  }

  const select = (locale: LocaleId) => {
    props.app.setLocale(locale)
    close(true)
  }

  onMount(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (open() && !root.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open()) {
        event.preventDefault()
        close(true)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    })
  })

  return (
    <div class="truss-locale" ref={root}>
      <button
        ref={button}
        type="button"
        class="truss-icon-button"
        aria-label={t().language}
        title={t().language}
        aria-expanded={open()}
        aria-haspopup="true"
        onClick={() => (open() ? close() : setOpen(true))}
      >
        <Icon svg={icons.globe} />
      </button>
      <Show when={open()}>
        <fieldset class="truss-locale-options">
          <legend class="truss-visually-hidden">{t().chooseLanguage}</legend>
          <For each={SUPPORTED_LOCALES}>
            {(locale) => (
              <label class="truss-locale-option">
                <input
                  type="radio"
                  name="truss-locale"
                  value={locale}
                  checked={props.app.locale() === locale}
                  onChange={() => select(locale)}
                />
                <span>{LOCALE_NAMES[locale]}</span>
              </label>
            )}
          </For>
        </fieldset>
      </Show>
    </div>
  )
}
