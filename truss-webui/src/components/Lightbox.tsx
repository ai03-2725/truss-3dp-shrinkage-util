import { createSignal, onCleanup, onMount } from 'solid-js'

const MIN_SCALE = 1
const MAX_SCALE = 8

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// Full-screen image viewer built on the native <dialog>, so focus trapping and
// Escape handling come from the platform. Supports wheel, pinch, drag-pan and
// button zoom. Tapping the backdrop - or the image while un-zoomed - closes it.
export function Lightbox(props: {
  src: string
  alt: string
  caption?: string
  onClose: () => void
}) {
  const [scale, setScale] = createSignal(1)
  const [offset, setOffset] = createSignal({ x: 0, y: 0 })
  let dialog!: HTMLDialogElement
  let viewport!: HTMLDivElement
  let image!: HTMLImageElement
  let trigger: Element | null = null

  const pointers = new Map<number, { x: number; y: number }>()
  let dragStart: { x: number; y: number; ox: number; oy: number } | null = null
  let pinchDist = 0
  let pinchScale = 1
  // Distinguishes a drag/pinch from a tap, so dragging never closes the viewer.
  let moved = false

  onMount(() => {
    trigger = document.activeElement
    dialog.showModal()
  })
  // Return focus to the thumbnail that opened the viewer.
  onCleanup(() => {
    if (trigger instanceof HTMLElement) trigger.focus()
  })

  const reset = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  const close = () => {
    reset()
    props.onClose()
  }

  // Keep the image from being panned completely out of view.
  const clampOffset = (x: number, y: number, s: number) => {
    const maxX = Math.max(0, (image.offsetWidth * s - viewport.clientWidth) / 2)
    const maxY = Math.max(0, (image.offsetHeight * s - viewport.clientHeight) / 2)
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) }
  }

  // Zoom about a point expressed relative to the centre of the viewport.
  const zoomAt = (next: number, originX: number, originY: number) => {
    const old = scale()
    const s = clamp(next, MIN_SCALE, MAX_SCALE)
    if (s === old) return
    const o = offset()
    const contentX = (originX - o.x) / old
    const contentY = (originY - o.y) / old
    setScale(s)
    setOffset(clampOffset(originX - contentX * s, originY - contentY * s, s))
  }

  const zoomByButton = (factor: number) => {
    const old = scale()
    const s = clamp(old * factor, MIN_SCALE, MAX_SCALE)
    const o = offset()
    setScale(s)
    setOffset(clampOffset((o.x * s) / old, (o.y * s) / old, s))
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    const rect = viewport.getBoundingClientRect()
    zoomAt(
      scale() * Math.exp(-event.deltaY * 0.0015),
      event.clientX - (rect.left + rect.width / 2),
      event.clientY - (rect.top + rect.height / 2),
    )
  }

  const pinch = () => {
    const [a, b] = [...pointers.values()]
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, dist: Math.hypot(a.x - b.x, a.y - b.y) }
  }

  const onPointerDown = (event: PointerEvent) => {
    viewport.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    moved = false
    if (pointers.size === 1) {
      const o = offset()
      dragStart = { x: event.clientX, y: event.clientY, ox: o.x, oy: o.y }
    } else if (pointers.size === 2) {
      pinchDist = pinch().dist
      pinchScale = scale()
      dragStart = null
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 1 && dragStart) {
      const dx = event.clientX - dragStart.x
      const dy = event.clientY - dragStart.y
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true
      setOffset(clampOffset(dragStart.ox + dx, dragStart.oy + dy, scale()))
    } else if (pointers.size === 2 && pinchDist > 0) {
      moved = true
      const { x, y, dist } = pinch()
      const rect = viewport.getBoundingClientRect()
      zoomAt(
        pinchScale * (dist / pinchDist),
        x - (rect.left + rect.width / 2),
        y - (rect.top + rect.height / 2),
      )
    }
  }

  const onPointerUp = (event: PointerEvent) => {
    pointers.delete(event.pointerId)
    if (pointers.size < 2) pinchDist = 0
    if (pointers.size === 1) {
      const [remaining] = [...pointers.values()]
      const o = offset()
      dragStart = { x: remaining.x, y: remaining.y, ox: o.x, oy: o.y }
    } else if (pointers.size === 0) {
      dragStart = null
    }
  }

  const onViewportClick = (event: MouseEvent) => {
    if (moved) return
    if (event.target === viewport || (event.target === image && scale() === 1)) close()
  }

  return (
    <dialog
      ref={dialog}
      class="truss-lightbox"
      aria-label={props.caption ? `${props.alt} - ${props.caption}` : props.alt}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
    >
      <div
        ref={viewport}
        class="truss-lightbox-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onViewportClick}
        onWheel={onWheel}
      >
        <img
          ref={image}
          src={props.src}
          alt={props.alt}
          draggable={false}
          style={{
            transform: `translate(${offset().x}px, ${offset().y}px) scale(${scale()})`,
            cursor: scale() > 1 ? 'grab' : 'zoom-in',
          }}
        />
      </div>
      <div class="truss-lightbox-controls">
        <button type="button" onClick={() => zoomByButton(1.5)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomByButton(1 / 1.5)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={reset} aria-label="Reset zoom">
          Reset
        </button>
        <button type="button" onClick={close} aria-label="Close enlarged image">
          Close
        </button>
      </div>
      {props.caption && <p class="truss-lightbox-caption">{props.caption}</p>}
    </dialog>
  )
}
