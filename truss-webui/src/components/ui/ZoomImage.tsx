import { type Component, createSignal } from 'solid-js'
import { type ImageKey, imageAlt, images } from '../../lib/assets'
import { Lightbox } from './Lightbox'

export interface ZoomImageProps {
  name: ImageKey
  class?: string
}

/** Image thumbnail that opens a tap-to-zoom lightbox on click (PRD §16). */
export const ZoomImage: Component<ZoomImageProps> = (props) => {
  const [open, setOpen] = createSignal(false)
  return (
    <>
      <button
        type="button"
        class={`truss-zoom ${props.class ?? ''}`}
        onClick={() => setOpen(true)}
      >
        <img
          src={images[props.name]}
          alt={imageAlt[props.name]}
          loading="lazy"
        />
      </button>
      <Lightbox
        src={open() ? images[props.name] : null}
        alt={imageAlt[props.name]}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
