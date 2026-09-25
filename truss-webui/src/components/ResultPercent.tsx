import { Show, createSignal, onCleanup } from 'solid-js'
import { Icon } from './Icon.tsx'
import { icons } from '../lib/icons.ts'

// Copy with the Clipboard API, falling back to a hidden textarea for
// non-secure-context deployments where the API is unavailable.
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}

// Final result percentage, shown in its own block with a copy button. `percent`
// is the already-formatted value (without the % sign); null while invalid.
export function ResultPercent(props: { percent: string | null }) {
  const [status, setStatus] = createSignal<'idle' | 'copied' | 'failed'>('idle')
  let timer: number | undefined
  onCleanup(() => clearTimeout(timer))

  const copy = async () => {
    if (props.percent === null) return
    const ok = await copyText(props.percent)
    setStatus(ok ? 'copied' : 'failed')
    clearTimeout(timer)
    timer = window.setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <>
      <h6>Updated XY shrinkage percentage to use:</h6>
      <div class="truss-result-percent">
        <output class="truss-result-percent-value">
          {props.percent === null ? '—' : `${props.percent}%`}
        </output>
        <button
          type="button"
          class="truss-button-secondary truss-icon-label"
          onClick={copy}
          disabled={props.percent === null}
        >
          <Icon svg={icons.copySimple} />
          {status() === 'copied' ? 'Copied!' : 'Copy'}
        </button>
        <span class="truss-visually-hidden" role="status">
          <Show when={status() === 'copied'}>Value copied to clipboard</Show>
          <Show when={status() === 'failed'}>Could not copy the value</Show>
        </span>
      </div>
    </>
  )
}
