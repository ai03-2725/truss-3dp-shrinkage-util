import { Show, createSignal } from 'solid-js'
import { Lightbox } from './Lightbox.tsx'
import { useLocale } from '../lib/locale-context.ts'
import { messages } from '../lib/messages.ts'

// Thumbnail that opens the zoomable lightbox. Kept separate from Guide so the
// locale-specific guide copy can import it without a cycle.
export function Figure(props: { src: string; alt: string; caption?: string; class?: string }) {
  const [open, setOpen] = createSignal(false)
  const locale = useLocale()
  const t = () => messages(locale())
  return (
    <figure class={props.class ?? 'truss-figure'}>
      <button
        type="button"
        class="truss-figure-zoom"
        aria-label={t().enlargeImage(props.alt)}
        onClick={() => setOpen(true)}
      >
        <img src={props.src} alt={props.alt} />
      </button>
      {props.caption && <figcaption>{props.caption}</figcaption>}
      <Show when={open()}>
        <Lightbox
          src={props.src}
          alt={props.alt}
          caption={props.caption}
          onClose={() => setOpen(false)}
        />
      </Show>
    </figure>
  )
}
