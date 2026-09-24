import { Show, createSignal, type JSX } from 'solid-js'
import { img } from '../lib/assets.ts'
import { Lightbox } from './Lightbox.tsx'

export function Figure(props: { src: string; alt: string; caption?: string; class?: string }) {
  const [open, setOpen] = createSignal(false)
  return (
    <figure class={props.class ?? 'truss-figure'}>
      <button
        type="button"
        class="truss-figure-zoom"
        aria-label={`Enlarge image: ${props.alt}`}
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

// Shared caliper cautions used by both flows' measurement screens.
export function MeasurementWarnings() {
  return (
    <div class="truss-callout">
      <h3>Before measuring</h3>
      <ol>
        <li>
          <strong>Do not apply excess force to the print with your calipers.</strong> The Truss
          resists abuse as much as possible, but 3D printed plastics are elastic. Applying excess
          force deforms the print and yields dimensions larger or smaller than actually printed.
          Ideally the calipers should exert no force at all - let go of the clamping side and let the
          print push the calipers back if necessary. If your calipers have thumb-wheel rollers, do
          not use them to exert excess force.
        </li>
        <li>
          <strong>Measure parallel to the dimension.</strong> Excessively angled calipers will fail
          to measure the dimension correctly.
        </li>
      </ol>
    </div>
  )
}

// Inner-jaw orientation guidance; the photos are from the Quad design but apply
// to every variant.
export function InnerJawGuidance(props: { note?: JSX.Element }) {
  return (
    <div class="truss-guidance">
      <h3>Positioning the inner jaws</h3>
      <p>
        The file guides your calipers' inner teeth as accurately as possible, but only when oriented
        correctly. <strong>Measuring incorrectly will yield incorrect, meaningless values.</strong>
      </p>
      {props.note}

      <h4>Correct</h4>
      <ul>
        <li>
          The caliper enters from the top of the print.
          <Figure src={img.caliperEnterTop} alt="Caliper entering the print from the top" />
        </li>
        <li>
          The flat inner sides of the caliper are flush against the supportive walls located halfway
          across the beam.
          <Figure
            src={img.innerCorrect1}
            alt="Inner caliper jaws flush against the supportive wall on one end"
          />
        </li>
        <li>
          The same is true for both ends of the caliper.
          <Figure
            src={img.innerCorrect2}
            alt="Inner caliper jaws flush against the supportive wall on the other end"
          />
        </li>
      </ul>

      <h4>Incorrect</h4>
      <ul>
        <li>
          The calipers' inner flat sides are not making contact against the supportive walls. This
          yields a diagonal measurement longer than what is printed.
          <Figure
            src={img.calipersIncorrectGap}
            alt="Incorrect inner measurement with a gap between the jaw and the wall"
          />
        </li>
        <li>
          The calipers are being used from the bottom of the print. The slanted sides of the caliper
          teeth should never face the supportive walls in the middle.
          <Figure
            src={img.calipersIncorrectSide}
            alt="Incorrect inner measurement taken from the bottom of the print"
          />
        </li>
      </ul>
    </div>
  )
}
