import { type Component, createSignal } from 'solid-js'

export interface CopyButtonProps {
  value: string
  label?: string
}

/** Copies its value and shows transient "Copied" feedback (PRD §13.2). */
export const CopyButton: Component<CopyButtonProps> = (props) => {
  const [copied, setCopied] = createSignal(false)
  let timer: number | undefined

  const copy = async () => {
    const text = props.value
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for non-secure contexts.
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      document.body.removeChild(area)
    }
    setCopied(true)
    window.clearTimeout(timer)
    timer = window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span class="truss-copy">
      <button
        type="button"
        class="truss-button truss-button--secondary"
        onClick={copy}
      >
        {copied() ? 'Copied' : (props.label ?? 'Copy')}
      </button>
      <span class="truss-copy__status" role="status" aria-live="polite">
        {copied() ? 'Copied to clipboard' : ''}
      </span>
    </span>
  )
}
